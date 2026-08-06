/**
 * Full-engine smoke test: runs runCreatorIntelligenceAnalysis exactly as the
 * API route does (including the corrective re-ask), against the configured
 * OpenRouter model. Proves the real report path end to end. Stage-7 diagnostic.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (process.argv[2]) process.env.OPENROUTER_MODEL = process.argv[2];

async function main() {
  const { runCreatorIntelligenceAnalysis } = await import('../lib/ai/engine');
  const context = {
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
  const started = Date.now();
  try {
    const { meta } = await runCreatorIntelligenceAnalysis(context);
    console.log(`✅ VALID report in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    console.log(`   provider=${meta.generationSource} model=${meta.model} tokens=${meta.completionTokens} cost=$${meta.estimatedCostUsd}`);
    console.log(`   attempts: ${meta.attempts.map((a) => `${a.provider}:${a.outcome}`).join(', ')}`);
  } catch (e: any) {
    console.log(`❌ FAILED in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    console.log(`   ${e?.constructor?.name}: ${e?.message?.slice(0, 300)}`);
    if (e?.attempts) console.log('   ' + e.attempts.map((a: any) => `${a.provider}:${a.outcome}(${a.error?.slice(0,80) ?? ''})`).join('\n   '));
  }
}
main();
