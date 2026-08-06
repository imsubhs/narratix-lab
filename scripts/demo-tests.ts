/**
 * Demo Mode regression tests (Stage 7A) — offline, no network.
 *
 *   npx tsx scripts/demo-tests.ts
 *
 * Verifies: every curated profile validates; the deterministic selector maps
 * representative scripts to the right style; personalization only touches
 * honestly-measurable fields; provenance is complete; profiles are genuinely
 * varied.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateAnalysisResult } from '../lib/ai/validate';
import { selectProfileStyle } from '../lib/ai/demo-selection';
import { buildDemoAnalysis } from '../lib/ai/demo';
import { buildDemoVariation } from '../lib/ai/demo-variations';

let passed = 0;
let failed = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const dir = resolve(process.cwd(), 'lib/ai/demo-profiles');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

console.log('— every curated profile is schema-valid —');
const profiles = files.map((f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8')));
for (const p of profiles) {
  const v = validateAnalysisResult(p);
  ok(`${p._profile.id} validates`, v.ok, v.problems.slice(0, 2).join('; '));
}

console.log('\n— library size & metadata —');
ok('at least 8 profiles exist', profiles.length >= 8, `found ${profiles.length}`);
ok('every profile has _profile.style', profiles.every((p) => p._profile?.style));

console.log('\n— deterministic selection maps to expected styles —');
const styles = profiles.map((p) => p._profile.style);
const cases: Array<[string, string, string]> = [
  ['storytelling', 'Three years ago I was sleeping in my car. I lost everything that year. That was chapter one.', 'narrative'],
  ['tutorial', 'How to edit a reel in five steps. Step one, cut the intro. Step two, add jump cuts. Step three, captions.', 'steps'],
  ['comedy', 'POV: you open the fridge for the 47th time. Same sad yogurt. It me. Relatable.', 'humor'],
  ['marketing', 'Stop scrolling. This $12 tool saved me 80% of my time. Get 3 months free. Link in bio. Buy now.', 'sales'],
  ['interview', 'I asked a millionaire what he would do differently. He said be useful, not right.', 'q&a'],
  ['product_launch', 'Today we are launching something new. Introducing our beta. The first thousand signups get founder pricing.', 'launch'],
];
for (const [expected, script, kind] of cases) {
  if (!styles.includes(expected)) { console.log(`  (skip ${expected} — not in library)`); continue; }
  const sel = selectProfileStyle(script, { niche: 'x', platform: 'TikTok', script }, styles);
  ok(`${kind} → ${expected}`, sel.style === expected, `got ${sel.style}`);
}

console.log('\n— selection is deterministic (same input → same output) —');
const s1 = selectProfileStyle('Step one, do this. Step two, do that. Step three, finish.', { niche: 'x', platform: 'y', script: 'x' }, styles);
const s2 = selectProfileStyle('Step one, do this. Step two, do that. Step three, finish.', { niche: 'x', platform: 'y', script: 'x' }, styles);
ok('stable selection', s1.style === s2.style && s1.matchScore === s2.matchScore);

console.log('\n— personalization only touches measurable fields (no fabricated evidence) —');
const script = 'This is my custom test script about gardening. It has a few sentences. Follow for more tips.';
const { results, meta } = buildDemoAnalysis({ niche: 'Urban gardening', platform: 'YouTube Shorts', goal: 'Grow', script });
const chosen = profiles.find((p) => p._profile.id === (results as any).demo.profile_id)!;
ok('niche personalized', (results as any).intelligence.niche === 'Urban gardening');
ok('platform personalized', (results as any).intelligence.platform === 'YouTube Shorts');
ok('word count is measured truthfully', (results as any).document_intelligence.words === script.split(/\s+/).filter(Boolean).length);
ok('detected hook = first sentence of THIS script', (results as any).document_intelligence.detected_hook.startsWith('This is my custom test script'));
ok('readability metric present', typeof (results as any).document_intelligence.readability_flesch === 'number');
ok('analytical prose is UNCHANGED from template (not fabricated)',
  (results as any).executive_summary.overall_verdict === chosen.executive_summary.overall_verdict);
ok('confidence NOT altered by personalization',
  (results as any).intelligence.confidence_score === chosen.intelligence.confidence_score);

console.log('\n— provenance is complete & honest —');
ok('generationSource = demo', meta.generationSource === 'demo');
ok('provider = demo', meta.provider === 'demo');
ok('model names the profile', /^demo\//.test(meta.model));
ok('analysisVersion set', Boolean(meta.analysisVersion));
ok('promptVersion set', Boolean(meta.promptVersion));
ok('cost is zero', meta.estimatedCostUsd === 0);
ok('demo provenance attached to results', Boolean((results as any).demo?.rationale));

console.log('\n— profiles are genuinely varied —');
const verdicts = new Set(profiles.map((p) => p.executive_summary.overall_verdict));
ok('all overall_verdicts are distinct', verdicts.size === profiles.length, `${verdicts.size}/${profiles.length} unique`);
const overalls = profiles.map((p) => p.executive_summary.overall_score);
ok('overall scores span a range', new Set(overalls).size >= 2, `values: ${overalls.join(',')}`);
const recs = new Set(profiles.map((p) => JSON.stringify(p.executive_summary.recommendations)));
ok('recommendations are distinct', recs.size === profiles.length, `${recs.size}/${profiles.length} unique`);

console.log('\n— cosmetic variation is deterministic & replayable —');
const vScriptA = 'Here is a script about morning routines and productivity for busy founders.';
const vScriptB = 'A completely different piece about deep-sea creatures and how they survive the pressure.';
const va1 = buildDemoVariation(vScriptA, 'demo-educational');
const va2 = buildDemoVariation(vScriptA, 'demo-educational');
const vb1 = buildDemoVariation(vScriptB, 'demo-educational');
ok('same script+profile → identical variation', JSON.stringify(va1) === JSON.stringify(va2));
ok('different scripts can diverge', JSON.stringify(va1) !== JSON.stringify(vb1));
ok('variation exposes all five cosmetic sections',
  Boolean(va1.opening && va1.actionPlanIntro && va1.nextSteps.length && va1.conclusion && va1.encouragement));

console.log('\n— variation copy fabricates NO analysis (no scores/percentages) —');
const allVariationText = [va1.opening, va1.actionPlanIntro, va1.conclusion, va1.encouragement, ...va1.nextSteps].join(' ');
ok('no numeric score/percentage in cosmetic copy', !/\d+\s*(%|\/\s*10|out of 10)/i.test(allVariationText), allVariationText.slice(0, 80));

console.log('\n— variation is attached to the demo report & auditable —');
const { results: rv } = buildDemoAnalysis({ niche: 'Productivity', platform: 'TikTok', goal: 'Grow', script: vScriptA });
ok('demo.variation attached', Boolean((rv as any).demo?.variation?.opening));
ok('demo.report_version attached', Boolean((rv as any).demo?.report_version));
ok('same submission → same variation via full pipeline',
  JSON.stringify((buildDemoAnalysis({ niche: 'Productivity', platform: 'TikTok', goal: 'Grow', script: vScriptA }).results as any).demo.variation)
  === JSON.stringify((rv as any).demo.variation));

console.log(`\n========================================`);
console.log(`Demo Mode tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
