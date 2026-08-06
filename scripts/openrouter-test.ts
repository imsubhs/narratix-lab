/**
 * Standalone OpenRouter diagnostic — Stage 6B.
 *
 * Bypasses the entire AI engine (no prompts, no validation, no SSE, no DB).
 * Its ONLY job is to prove whether OpenRouter itself responds, and to measure
 * the request lifecycle end to end for progressively larger payloads.
 *
 * Usage:
 *   npx tsx scripts/openrouter-test.ts            # runs Tests A–D
 *   npx tsx scripts/openrouter-test.ts --no-timeout   # reproduce the hang (Ctrl-C to abort)
 *
 * Reads OPENROUTER_* from .env.local directly so it needs no Next.js runtime.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---- minimal .env.local loader (no dependency on dotenv) --------------------
function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    console.warn('[diag] could not read .env.local — relying on process env');
  }
}
loadEnvLocal();

const BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
const API_KEY = process.env.OPENROUTER_API_KEY || '';
const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 60000);
const NO_TIMEOUT = process.argv.includes('--no-timeout');

const mask = (k: string) => (k ? `${k.slice(0, 8)}…${k.slice(-4)} (len ${k.length})` : '[MISSING]');

interface CaseResult {
  name: string;
  ok: boolean;
  status: number | null;
  ttfbMs: number | null;
  totalMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  finishReason: string | null;
  bytes: number | null;
  error: string | null;
}

async function runCase(name: string, userContent: string, maxTokens: number): Promise<CaseResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = NO_TIMEOUT ? null : setTimeout(() => controller.abort(), TIMEOUT_MS);

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userContent }],
  });

  console.log(`\n── ${name} ─────────────────────────────`);
  console.log(`  model=${MODEL}  max_tokens=${maxTokens}  reqBytes=${Buffer.byteLength(body)}  timeout=${NO_TIMEOUT ? 'NONE' : TIMEOUT_MS + 'ms'}`);
  console.log(`  t0: request sent`);

  let ttfbMs: number | null = null;
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: NO_TIMEOUT ? undefined : controller.signal,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body,
    });
    ttfbMs = Date.now() - started;
    console.log(`  t+${ttfbMs}ms: response headers received (status ${res.status})`);
    console.log(`  x-request-id: ${res.headers.get('x-request-id') ?? '(none)'}`);

    const text = await res.text();
    const totalMs = Date.now() - started;
    console.log(`  t+${totalMs}ms: body fully read (${Buffer.byteLength(text)} bytes)`);

    let json: any = null;
    try { json = JSON.parse(text); } catch { /* leave null */ }

    const choice = json?.choices?.[0];
    const result: CaseResult = {
      name,
      ok: res.ok && !json?.error,
      status: res.status,
      ttfbMs,
      totalMs,
      promptTokens: json?.usage?.prompt_tokens ?? null,
      completionTokens: json?.usage?.completion_tokens ?? null,
      finishReason: choice?.finish_reason ?? null,
      bytes: Buffer.byteLength(text),
      error: json?.error?.message ?? (res.ok ? null : text.slice(0, 300)),
    };
    console.log(`  usage: prompt=${result.promptTokens} completion=${result.completionTokens} finish=${result.finishReason}`);
    if (result.error) console.log(`  ERROR: ${result.error}`);
    else console.log(`  content preview: ${String(choice?.message?.content ?? '').slice(0, 120).replace(/\n/g, ' ')}`);
    return result;
  } catch (err: any) {
    const totalMs = Date.now() - started;
    const aborted = err?.name === 'AbortError';
    console.log(`  t+${totalMs}ms: ${aborted ? `ABORTED (timeout ${TIMEOUT_MS}ms exceeded)` : 'FETCH THREW'}: ${err?.message}`);
    return {
      name, ok: false, status: null, ttfbMs, totalMs,
      promptTokens: null, completionTokens: null, finishReason: null, bytes: null,
      error: aborted ? `timeout after ${TIMEOUT_MS}ms` : String(err?.message ?? err),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function main() {
  console.log('OpenRouter Diagnostic — Stage 6B');
  console.log('================================');
  console.log(`baseUrl : ${BASE_URL}`);
  console.log(`model   : ${MODEL}`);
  console.log(`api key : ${mask(API_KEY)}`);
  console.log(`timeout : ${NO_TIMEOUT ? 'DISABLED (reproducing the hang)' : TIMEOUT_MS + 'ms'}`);

  if (!API_KEY) {
    console.error('\nNo OPENROUTER_API_KEY found. Aborting.');
    process.exit(1);
  }

  const results: CaseResult[] = [];
  results.push(await runCase('Test A — Hello', 'Hello', 50));
  results.push(await runCase('Test B — One sentence', 'Write one sentence about the ocean.', 100));
  results.push(await runCase('Test C — Summarize paragraph',
    'Summarize this in one line: The sun is a star at the center of the solar system. It is a nearly perfect ball of hot plasma.', 200));
  results.push(await runCase('Test D — Analyze 150-word script',
    'Analyze this short-form video script and return JSON with keys hook, clarity, cta:\n\n' +
    ('Ever wondered why your videos flop? '.repeat(20)).trim(), 2000));

  console.log('\n\n==================== SUMMARY ====================');
  console.log('case                          ok     status  ttfb     total    ptok  ctok  finish');
  for (const r of results) {
    console.log(
      `${r.name.padEnd(28)}  ${(r.ok ? 'PASS' : 'FAIL').padEnd(5)}  ${String(r.status ?? '-').padEnd(6)}  ` +
      `${String(r.ttfbMs ?? '-').padEnd(7)}  ${String(r.totalMs).padEnd(7)}  ${String(r.promptTokens ?? '-').padEnd(4)}  ` +
      `${String(r.completionTokens ?? '-').padEnd(4)}  ${r.finishReason ?? '-'}`
    );
  }
  const anyPass = results.some((r) => r.ok);
  console.log('\nVerdict:', anyPass
    ? 'OpenRouter responds. If the app still hangs, the fault is client-side (missing timeout).'
    : 'OpenRouter did NOT return a usable completion for this model/key. See errors above.');
  process.exit(anyPass ? 0 : 2);
}

main();
