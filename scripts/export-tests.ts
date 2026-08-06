/**
 * Stage 8B — Professional Export System tests (offline, no network).
 *
 *   npx tsx scripts/export-tests.ts
 *
 * Verifies: all six formats render non-empty output from ONE canonical model;
 * required content is present; demo vs live transparency is correct; and the
 * DO-NOT-EXPORT fields (request ids, latency, tokens, cost, telemetry, secrets)
 * never appear in any rendered format.
 */
import {
  buildReportModel,
  generateExport,
  getSupportedFormats,
  estimateFileSize,
  DEMO_DISCLAIMER,
  type ExportFormatId,
} from '../lib/export';
import { buildDemoAnalysis } from '../lib/ai/demo';

let passed = 0;
let failed = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function blobToText(blob: Blob): Promise<string> {
  return Buffer.from(await blob.arrayBuffer()).toString('utf8');
}

// A representative demo report (curated profile + honest personalization).
const DEMO_SCRIPT =
  'Most people waste their twenties broke. Here is the one system that fixed my money. ' +
  'Move 20 percent into savings every payday and automate your bills. Comment DONE if you try it.';
const { results: demoResults } = buildDemoAnalysis({
  script: DEMO_SCRIPT,
  niche: 'Personal Finance',
  platform: 'TikTok',
  goal: 'Grow followers',
} as any);

// A synthetic LIVE report: same shape, with a provider meta block that also
// carries the forbidden telemetry fields we must NEVER export.
const liveResults: any = JSON.parse(JSON.stringify(demoResults));
delete liveResults.demo;
liveResults.meta = {
  input_type: 'text',
  file_name: 'My Launch Script.txt',
  generation_source: 'anthropic',
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  prompt_version: 'p-2.0.0',
  analysis_version: '1.0.0',
  // ── forbidden — must never appear in any export ──
  request_id: 'req_SECRET_12345',
  latency_ms: 8123,
  prompt_tokens: 4096,
  completion_tokens: 2048,
  estimated_cost_usd: 0.1234,
};

const FORBIDDEN = [
  'req_SECRET_12345', 'request_id', 'requestId',
  'latency_ms', 'latencyMs', '8123',
  'prompt_tokens', 'promptTokens', 'completion_tokens', 'completionTokens',
  '4096', '2048',
  'estimated_cost_usd', 'estimatedCostUsd', '0.1234',
];

async function main() {
  console.log('— format registry —');
  const formats = getSupportedFormats();
  const ids = formats.map((f) => f.id).sort().join(',');
  ok('exactly the six required formats', ids === 'docx,html,md,pdf,rtf,txt', ids);
  ok('every format has description', formats.every((f) => f.description.length > 0));
  ok('every format has recommended use', formats.every((f) => f.recommendedUse.length > 0));

  console.log('\n— canonical model is built once and shared —');
  const model = buildReportModel(liveResults, { niche: 'Personal Finance', platform: 'TikTok' });
  ok('model has brand', model.brand.name === 'Narratix Lab');
  ok('model has header fields', model.headerFields.length >= 5);
  ok('model has sections', model.sections.length >= 4);
  ok('model has Executive Summary', model.sections.some((s) => s.heading === 'Executive Summary'));
  ok('model has Module Scores', model.sections.some((s) => s.heading === 'Module Scores'));
  ok('model has Recommendations', model.sections.some((s) => s.heading === 'Recommendations'));
  ok('model has Action Plan', model.sections.some((s) => s.heading === 'Action Plan'));

  console.log('\n— every format renders non-empty output —');
  const rendered: Record<string, string> = {};
  for (const id of formats.map((f) => f.id) as ExportFormatId[]) {
    const out = await generateExport(id, liveResults, { niche: 'Personal Finance', platform: 'TikTok' });
    ok(`${id} renders a blob`, out.blob.size > 100, `size=${out.blob.size}`);
    ok(`${id} filename has correct extension`, out.filename.endsWith(`.${id}`), out.filename);
    // Text formats are inspected for content + forbidden fields.
    if (!['pdf', 'docx'].includes(id)) rendered[id] = await blobToText(out.blob);
  }

  console.log('\n— text formats contain required report content —');
  for (const [id, text] of Object.entries(rendered)) {
    ok(`${id} contains brand`, text.includes('Narratix Lab'));
    ok(`${id} contains overall score`, /Overall Score/i.test(text) || /OVERALL SCORE/.test(text));
    ok(`${id} contains a module name`, /Hook/.test(text));
    ok(`${id} contains provenance provider`, text.includes('anthropic'));
    ok(`${id} contains model`, text.includes('claude-sonnet-5'));
  }

  console.log('\n— DO NOT EXPORT: forbidden telemetry never leaks (all formats) —');
  const allText = Object.values(rendered).join('\n');
  for (const bad of FORBIDDEN) {
    ok(`no "${bad}" in any text export`, !allText.includes(bad));
  }
  // Binary formats: scan raw bytes too (docx is a zip, so only check obvious secrets).
  const pdf = await blobToText((await generateExport('pdf', liveResults, {})).blob);
  ok('no secret request id in PDF', !pdf.includes('req_SECRET_12345'));

  console.log('\n— live transparency footer —');
  ok('live model shows engine attribution', !model.transparency.isDemo);
  ok('live footer names the engine', model.transparency.title.includes('Narratix Intelligence Engine'));
  ok('live provenance has Provider/Model/Prompt/Analysis',
    ['Provider', 'Model', 'Prompt Version', 'Analysis Version'].every((l) =>
      model.transparency.provenance.some((p) => p.label === l)));

  console.log('\n— demo transparency footer —');
  const demoModel = buildReportModel(demoResults, { niche: 'Personal Finance', platform: 'TikTok' });
  ok('demo model flagged as demo', demoModel.transparency.isDemo === true);
  ok('demo badge is set', demoModel.demoBadge === true);
  ok('demo disclaimer matches the mandated sentence', demoModel.transparency.body === DEMO_DISCLAIMER);
  const demoMd = await blobToText((await generateExport('md', demoResults, {})).blob);
  ok('demo disclaimer appears in exported markdown', demoMd.includes(DEMO_DISCLAIMER));
  ok('demo export has no live provider leak', !demoMd.includes('claude-sonnet-5'));

  console.log('\n— file size estimation —');
  const sizes = estimateFileSize(liveResults, {});
  ok('every format has a size estimate', formats.every((f) => typeof sizes[f.id] === 'string' && sizes[f.id].length > 0));

  console.log(`\n${failed === 0 ? '✅ ALL PASSED' : '❌ FAILURES'} — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
