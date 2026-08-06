/**
 * Startup validation sequence — Stage 3 (AI activation preparation).
 *
 * Run BEFORE exposing the AI pipeline to users (local boot, staging deploy,
 * production activation). Free: uses only GET /v1/models probes — no tokens.
 *
 *   npm run validate:startup
 *   npm run validate:startup -- --url https://your-deployment.example.com
 *
 * Checks, in order:
 *   1. Required environment variables (present, not placeholders)
 *   2. Provider connectivity   (GET /v1/models reachable)
 *   3. Authentication          (probe returns 200, not 401/403)
 *   4. Model availability      (GET /v1/models/{configured model} → 200)
 *   5. Prompt version          (PROMPT_VERSION is a valid semver)
 *   6. Health endpoint         (in-process checkAllProviders; with --url,
 *                               also probes the deployed /api/ai/health route)
 *
 * Exit codes: 0 = ready · 1 = one or more checks failed
 *
 * This script validates activation readiness only. For live report-quality
 * validation (5-script LLM run, costs tokens) use: npm run validate:ai
 */
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local BEFORE importing lib modules (config reads env at import time).
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!(key in process.env)) process.env[key.trim()] = rest.join('=').trim();
  }
}

interface CheckResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  detail: string;
}

const results: CheckResult[] = [];

function record(step: string, status: CheckResult['status'], detail: string) {
  results.push({ step, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : status === 'SKIP' ? '⏭️ ' : '❌';
  console.log(`  ${icon} ${step}: ${detail}`);
}

async function fetchStatus(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 8000
): Promise<{ status: number | null; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal, cache: 'no-store' });
    return { status: res.status, error: null };
  } catch (err) {
    return { status: null, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const urlFlagIndex = process.argv.indexOf('--url');
  const deployedUrl = urlFlagIndex !== -1 ? process.argv[urlFlagIndex + 1] : null;

  const { AI_CONFIG, isConfiguredSecret } = await import('../lib/ai/config');
  const { checkAllProviders } = await import('../lib/ai/health');
  const { PROMPT_VERSION } = await import('../lib/ai/prompts');

  console.log('════════ 1. REQUIRED ENVIRONMENT VARIABLES ════════');
  const requiredAppVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  for (const name of requiredAppVars) {
    const value = process.env[name];
    if (value && value.trim() && !/^(your_|placeholder|changeme)/i.test(value.trim())) {
      record(name, 'PASS', 'set');
    } else {
      record(name, 'FAIL', 'missing or placeholder — app cannot authenticate users / store analyses');
    }
  }
  const anthropicConfigured = isConfiguredSecret(process.env.ANTHROPIC_API_KEY);
  const openaiConfigured = isConfiguredSecret(process.env.OPENAI_API_KEY);
  const openrouterConfigured = isConfiguredSecret(process.env.OPENROUTER_API_KEY);
  if (anthropicConfigured || openaiConfigured || openrouterConfigured) {
    record(
      'AI provider keys',
      'PASS',
      `configured: ${[
        anthropicConfigured && 'ANTHROPIC_API_KEY',
        openaiConfigured && 'OPENAI_API_KEY',
        openrouterConfigured && 'OPENROUTER_API_KEY',
      ]
        .filter(Boolean)
        .join(', ')}`
    );
  } else {
    record('AI provider keys', 'FAIL', 'no configured AI key — pipeline will serve Basic Creator Diagnostics only');
  }
  const primary = (process.env.PRIMARY_AI_PROVIDER || '').trim().toLowerCase();
  if (primary) {
    if (AI_CONFIG.providerOrder[0] === primary) {
      record('PRIMARY_AI_PROVIDER', 'PASS', `${primary} is first in the waterfall`);
    } else {
      record('PRIMARY_AI_PROVIDER', 'WARN', `"${primary}" is not a known provider — ignored (using default order)`);
    }
  } else {
    record('PRIMARY_AI_PROVIDER', 'SKIP', 'not set — using AI_PROVIDER_ORDER / default');
  }
  record(
    'Provider order',
    'PASS',
    `${AI_CONFIG.providerOrder.join(' → ')} (models: anthropic=${AI_CONFIG.anthropic.model}, openai=${AI_CONFIG.openai.model}, openrouter=${AI_CONFIG.openrouter.model})`
  );

  console.log('\n════════ 2+3. PROVIDER CONNECTIVITY & AUTHENTICATION ════════');
  const health = await checkAllProviders();
  for (const p of health) {
    if (!p.configured) {
      record(`${p.provider} connectivity`, 'SKIP', 'key not configured');
      continue;
    }
    if (!p.reachable) {
      record(`${p.provider} connectivity`, 'FAIL', `unreachable: ${p.error ?? 'unknown network error'}`);
      continue;
    }
    record(`${p.provider} connectivity`, 'PASS', 'API reachable');
    if (p.authValid) {
      record(`${p.provider} authentication`, 'PASS', 'key accepted (HTTP 200)');
    } else {
      record(`${p.provider} authentication`, 'FAIL', `key rejected (${p.error ?? `HTTP ${p.status}`}) — rotate the key`);
    }
  }

  console.log('\n════════ 4. MODEL AVAILABILITY ════════');
  // The health probe validates the key against the models *list*; here we
  // confirm the *configured* model id actually exists for that account —
  // an invalid ANTHROPIC_MODEL/OPENAI_MODEL passes health but fails analyses.
  const anthropicHealth = health.find((p) => p.provider === 'anthropic');
  if (anthropicHealth?.configured && anthropicHealth.authValid) {
    const { status, error } = await fetchStatus(
      `https://api.anthropic.com/v1/models/${encodeURIComponent(AI_CONFIG.anthropic.model)}`,
      {
        'x-api-key': process.env.ANTHROPIC_API_KEY as string,
        'anthropic-version': '2023-06-01',
      }
    );
    if (status === 200) record(`anthropic model ${AI_CONFIG.anthropic.model}`, 'PASS', 'model id exists');
    else if (status === 404) record(`anthropic model ${AI_CONFIG.anthropic.model}`, 'FAIL', 'model id not found (retired or misspelled) — update ANTHROPIC_MODEL');
    else record(`anthropic model ${AI_CONFIG.anthropic.model}`, 'WARN', `could not verify (HTTP ${status ?? '—'} ${error ?? ''})`);
  } else {
    record(`anthropic model ${AI_CONFIG.anthropic.model}`, 'SKIP', 'provider not configured or auth failed');
  }
  const openaiHealth = health.find((p) => p.provider === 'openai');
  if (openaiHealth?.configured && openaiHealth.authValid) {
    const { status, error } = await fetchStatus(
      `https://api.openai.com/v1/models/${encodeURIComponent(AI_CONFIG.openai.model)}`,
      { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    );
    if (status === 200) record(`openai model ${AI_CONFIG.openai.model}`, 'PASS', 'model id exists');
    else if (status === 404) record(`openai model ${AI_CONFIG.openai.model}`, 'FAIL', 'model id not found — update OPENAI_MODEL');
    else record(`openai model ${AI_CONFIG.openai.model}`, 'WARN', `could not verify (HTTP ${status ?? '—'} ${error ?? ''})`);
  } else {
    record(`openai model ${AI_CONFIG.openai.model}`, 'SKIP', 'provider not configured or auth failed');
  }
  const openrouterHealth = health.find((p) => p.provider === 'openrouter');
  if (openrouterHealth?.configured && openrouterHealth.authValid) {
    // OpenRouter has no per-model endpoint; fetch the catalog (free) and confirm
    // the configured id is listed for this account.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${AI_CONFIG.openrouter.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        signal: controller.signal,
        cache: 'no-store',
      });
      if (res.ok) {
        const body = (await res.json()) as { data?: Array<{ id?: string }> };
        const exists = (body.data ?? []).some((m) => m.id === AI_CONFIG.openrouter.model);
        if (exists) record(`openrouter model ${AI_CONFIG.openrouter.model}`, 'PASS', 'model id exists');
        else record(`openrouter model ${AI_CONFIG.openrouter.model}`, 'FAIL', 'model id not in catalog — update OPENROUTER_MODEL');
      } else {
        record(`openrouter model ${AI_CONFIG.openrouter.model}`, 'WARN', `could not verify (HTTP ${res.status})`);
      }
    } catch (err) {
      record(`openrouter model ${AI_CONFIG.openrouter.model}`, 'WARN', `could not verify (${err instanceof Error ? err.message : String(err)})`);
    } finally {
      clearTimeout(timer);
    }
  } else {
    record(`openrouter model ${AI_CONFIG.openrouter.model}`, 'SKIP', 'provider not configured or auth failed');
  }

  console.log('\n════════ 5. PROMPT VERSION ════════');
  if (/^\d+\.\d+\.\d+$/.test(PROMPT_VERSION)) {
    record('PROMPT_VERSION', 'PASS', `v${PROMPT_VERSION}`);
  } else {
    record('PROMPT_VERSION', 'FAIL', `"${PROMPT_VERSION}" is not valid semver — stored reports lose auditability`);
  }

  console.log('\n════════ 6. HEALTH ENDPOINT ════════');
  const anyHealthy = health.some((p) => p.configured && p.authValid === true);
  record(
    'in-process pipeline health',
    anyHealthy ? 'PASS' : 'FAIL',
    anyHealthy
      ? `at least one provider is healthy (${health.filter((p) => p.authValid).map((p) => p.provider).join(', ')})`
      : 'no healthy provider — /api/ai/health would return 503'
  );
  if (deployedUrl) {
    const endpoint = `${deployedUrl.replace(/\/$/, '')}/api/ai/health`;
    const { status, error } = await fetchStatus(endpoint, {});
    // The route requires a signed-in user, so an unauthenticated probe
    // returning 401 proves the route is deployed and responding.
    if (status === 401 || status === 200 || status === 503) {
      record('deployed /api/ai/health', 'PASS', `endpoint responding (HTTP ${status}); sign in to read provider detail`);
    } else {
      record('deployed /api/ai/health', 'FAIL', `unexpected response (HTTP ${status ?? '—'} ${error ?? ''}) — route missing or deploy broken`);
    }
  } else {
    record('deployed /api/ai/health', 'SKIP', 'pass --url https://<deployment> to probe the deployed endpoint');
  }

  const failures = results.filter((r) => r.status === 'FAIL');
  const warnings = results.filter((r) => r.status === 'WARN');
  console.log(`\n════════ RESULT: ${failures.length === 0 ? 'READY' : 'NOT READY'} ════════`);
  console.log(`  ${results.filter((r) => r.status === 'PASS').length} passed · ${failures.length} failed · ${warnings.length} warnings · ${results.filter((r) => r.status === 'SKIP').length} skipped`);
  if (failures.length > 0) {
    console.log('\nBlocking issues:');
    for (const f of failures) console.log(`  ✗ ${f.step}: ${f.detail}`);
    console.log('\nThe app still fails safely (Basic Creator Diagnostics, credit refunded),');
    console.log('but no real AI reports will be generated until the issues above are fixed.');
  } else {
    console.log('\nStartup validation passed. Next step for full activation confidence:');
    console.log('  npm run validate:ai   (live 5-script report-quality validation — costs tokens)');
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Startup validation crashed:', err);
  process.exit(1);
});
