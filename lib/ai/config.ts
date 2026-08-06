/**
 * AI layer configuration — Stage 2 reconstruction.
 * All models and budgets are environment-driven; nothing is hardcoded at call sites.
 */

export type ProviderName = 'anthropic' | 'openai' | 'openrouter';

/**
 * Version of the analysis ENGINE (orchestration + module set), distinct from
 * PROMPT_VERSION (the wording of the prompt). Stored on every report so
 * provenance stays auditable as the engine evolves.
 */
export const ANALYSIS_VERSION = '1.0.0';

const KNOWN_PROVIDERS: readonly ProviderName[] = ['anthropic', 'openai', 'openrouter'];

function isProviderName(value: string): value is ProviderName {
  return (KNOWN_PROVIDERS as readonly string[]).includes(value);
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Resolve the provider waterfall from the environment.
 *
 * AI_PROVIDER_ORDER defines the full ordered list (default: all three).
 * PRIMARY_AI_PROVIDER, if set to a valid provider, is promoted to the front of
 * that list so the engine tries it first while still keeping the others as
 * automatic fallbacks. e.g. PRIMARY_AI_PROVIDER=openrouter → OpenRouter first.
 */
function providerOrderFromEnv(): ProviderName[] {
  const parsed = (process.env.AI_PROVIDER_ORDER || 'anthropic,openai,openrouter')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(isProviderName);
  let order: ProviderName[] = parsed.length > 0 ? parsed : ['anthropic', 'openai', 'openrouter'];

  const primary = (process.env.PRIMARY_AI_PROVIDER || '').trim().toLowerCase();
  if (primary && isProviderName(primary)) {
    order = [primary, ...order.filter((p) => p !== primary)];
  }

  // De-duplicate while preserving order.
  return order.filter((p, i) => order.indexOf(p) === i);
}

export const AI_CONFIG = {
  anthropic: {
    // Replacement for the retired claude-3-5-sonnet-20240620 (per Anthropic's
    // official migration mapping). Override with ANTHROPIC_MODEL, e.g.
    // claude-opus-4-8 for maximum analysis depth.
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxOutputTokens: intFromEnv('ANTHROPIC_MAX_OUTPUT_TOKENS', 16000),
  },
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    maxOutputTokens: intFromEnv('OPENAI_MAX_OUTPUT_TOKENS', 16000),
  },
  openrouter: {
    // Env-driven; the free Nemotron model is only a default fallback. Override
    // with OPENROUTER_MODEL (e.g. a paid model for higher throughput).
    model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free',
    maxOutputTokens: intFromEnv('OPENROUTER_MAX_OUTPUT_TOKENS', 16000),
    baseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
    // Optional attribution headers OpenRouter surfaces on your dashboard.
    referer: process.env.OPENROUTER_HTTP_REFERER || process.env.OPENROUTER_SITE_URL || '',
    title: process.env.OPENROUTER_X_TITLE || process.env.OPENROUTER_APP_NAME || '',
    // Hard wall-clock ceiling for a single OpenRouter request. Node's undici
    // fetch() has NO default request timeout, so without this a stalled
    // free-tier generation never settles and the whole SSE stream hangs at
    // 50%. 90s comfortably covers observed worst-case latency (diagnostic
    // Test E: ~22s for a full report) while guaranteeing the promise settles.
    timeoutMs: intFromEnv('OPENROUTER_TIMEOUT_MS', 90_000),
    // In-adapter retries for transient failures (timeout/network/429/503/5xx)
    // with exponential backoff. Auth/model_not_found are never retried.
    maxAttempts: intFromEnv('OPENROUTER_MAX_ATTEMPTS', 2),
    retryBaseDelayMs: intFromEnv('OPENROUTER_RETRY_BASE_DELAY_MS', 1_000),
  },
  providerOrder: providerOrderFromEnv(),
  /** Engine-level retries for transient errors (SDKs also retry internally). */
  transientRetryDelayMs: 2000,
  /** How long a provider stays skipped after an auth/model configuration failure. */
  circuitCooldownMs: intFromEnv('AI_CIRCUIT_COOLDOWN_MS', 10 * 60 * 1000),
  /** Health probe timeout. */
  healthProbeTimeoutMs: 8000,
} as const;

/**
 * A value is "configured" only if it looks like a real secret — empty strings,
 * template placeholders (your_*, placeholder_*) and whitespace never count.
 * This closes the Stage 1 gap where hasConfiguredKey() checked placeholder
 * strings that didn't match .env.example.
 */
export function isConfiguredSecret(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.length < 20) return false;
  if (/^(your_|placeholder|changeme|xxx)/i.test(v)) return false;
  return true;
}

/** USD per 1M tokens (input, output). Used only for logged cost estimates. */
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-8': { input: 5.0, output: 25.0 },
  'claude-opus-4-7': { input: 5.0, output: 25.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  // OpenRouter free tier — no token cost.
  'nvidia/nemotron-3-ultra-550b-a55b:free': { input: 0.0, output: 0.0 },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number | null,
  completionTokens: number | null
): number | null {
  const pricing = PRICING_PER_MTOK[model];
  if (!pricing || promptTokens == null || completionTokens == null) return null;
  const cost =
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
