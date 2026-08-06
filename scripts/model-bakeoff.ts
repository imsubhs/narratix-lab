/**
 * Model bake-off: run the REAL v3 prompt through candidate OpenRouter free
 * models and score them with the REAL validator. Picks the model that produces
 * a schema-valid report fastest. Temporary Stage-7 diagnostic.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
try {
  for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}
import { buildSystemPrompt, buildUserPrompt, type AnalysisPromptContext } from '../lib/ai/prompts';
import { extractJsonObject, validateAnalysisResult } from '../lib/ai/validate';

const KEY = process.env.OPENROUTER_API_KEY!;
const BASE = 'https://openrouter.ai/api/v1';

const CANDIDATES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
    ];

const context: AnalysisPromptContext = {
  niche: 'Personal finance for young professionals',
  platform: 'Instagram Reels',
  goal: 'Grow followers and drive saves',
  concern: 'People scroll past in the first 3 seconds',
  videoLength: '45 seconds',
  script: `Most people waste their entire twenties being broke for no reason.
I made every money mistake you can think of by the time I was 25.
Here is the one system that finally fixed it.
Every time you get paid, move 20 percent into a separate account before you touch anything.
Then automate your bills so you never think about them.
Whatever is left is yours to spend guilt free.
I went from zero savings to twelve thousand dollars in eight months doing exactly this.
Try it for one paycheck and comment DONE if you actually do it.`,
};

const system = buildSystemPrompt(context.platform);
const user = buildUserPrompt(context);

async function runModel(model: string) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    if (!res.ok) {
      const t = await res.text();
      return { model, ok: false, elapsed, note: `HTTP ${res.status}: ${t.slice(0, 160)}` };
    }
    const data = await res.json();
    if (data?.error) return { model, ok: false, elapsed, note: `envelope error: ${JSON.stringify(data.error).slice(0, 200)}` };
    const text = data?.choices?.[0]?.message?.content ?? '';
    const finish = data?.choices?.[0]?.finish_reason;
    const ct = data?.usage?.completion_tokens;
    let parsed: any;
    try { parsed = extractJsonObject(text); }
    catch (e) { return { model, ok: false, elapsed, note: `JSON extract failed (finish=${finish}, ${ct}tok, ${text.length}chars): head=${text.slice(0,120).replace(/\n/g,' ')}` }; }
    const v = validateAnalysisResult(parsed);
    return { model, ok: v.ok, elapsed, note: v.ok ? `VALID (finish=${finish}, ${ct}tok)` : `${v.problems.length} problems: ${v.problems.slice(0, 5).join(' | ')}` };
  } catch (e) {
    return { model, ok: false, elapsed: ((Date.now() - started) / 1000).toFixed(1), note: `threw: ${(e as Error).message.slice(0, 120)}` };
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  console.log(`Bake-off across ${CANDIDATES.length} models (system=${system.length} chars, user=${user.length} chars)\n`);
  for (const m of CANDIDATES) {
    process.stdout.write(`→ ${m} ... `);
    let r = await runModel(m);
    if (!r.ok && /429|rate-limit/i.test(r.note)) {
      process.stdout.write('(429, retry in 8s) ');
      await new Promise((res) => setTimeout(res, 8000));
      r = await runModel(m);
    }
    console.log(`${r.ok ? '✅' : '❌'} ${r.elapsed}s  ${r.note}`);
  }
})();
