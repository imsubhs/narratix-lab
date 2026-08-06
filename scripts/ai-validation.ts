/**
 * Live AI validation harness — Stage 2.
 * Run: npm run validate:ai            (connectivity + 5-script validation)
 *      npm run validate:ai -- --connectivity-only
 *
 * 1. Provider connectivity test (free GET /v1/models probes).
 * 2. Five distinct scripts (poor promo / educational / comedy / emotional
 *    storytelling / sales) through the real engine.
 * 3. Content-sensitivity checks: distinct outputs, verbatim grounding,
 *    duration-aware timelines, honest confidence variance.
 *
 * Exit codes: 0 = pass · 1 = validation failures · 2 = BLOCKED (no healthy provider)
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

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'Stage2_Reconstruction', 'validation');

interface TestScript {
  id: string;
  label: string;
  niche: string;
  platform: string;
  script: string;
}

const TEST_SCRIPTS: TestScript[] = [
  {
    id: 'poor-promo',
    label: 'Poor promotional script',
    niche: 'E-commerce',
    platform: 'Instagram Reels',
    script: `Hello everyone and welcome back to my page. Today I want to talk to you about my new store. We have many products. We sell phone cases, chargers, cables and also headphones. The quality is very good and the prices are also very good. We ship worldwide and shipping is fast. If you want you can check the link. We also have discounts sometimes. Our store has been open for two years and we have many happy customers. The customer service is available. Thank you so much for watching this video and have a nice day.`,
  },
  {
    id: 'educational',
    label: 'Educational script',
    niche: 'Personal Finance',
    platform: 'YouTube Shorts',
    script: `If you got a 10% raise this year, you might actually be earning less than last year. Here's the math nobody shows you. Inflation ran 4.2%, so your real raise is 5.8%. But you probably moved up a tax bracket on the margin, which claws back another 1 to 2%. Then your rent renewal added 8%. Run those numbers and a "10% raise" can leave your monthly savings rate lower than before. The fix takes 15 minutes: calculate your real hourly wage — take-home pay divided by hours worked including your commute. Track it every quarter. When it drops two quarters in a row, that's your signal to negotiate or move. Save this so you can run your own numbers on your next review.`,
  },
  {
    id: 'comedy',
    label: 'Comedy script',
    niche: 'Lifestyle Comedy',
    platform: 'TikTok',
    script: `POV: you said "let's split the bill" in front of your Indian dad. He has now snatched the card machine from the waiter's hand like it owes him money. My cousin tried to pay once. ONCE. We didn't see him for three festivals. Dad did the fake wallet fumble, then full WWE-blocked the card reader with his body. The waiter is just standing there holding a candle like it's a hostage negotiation. And the wildest part? Dad will complain about the bill the entire drive home. "Four hundred rupees for paneer?!" Sir, YOU body-slammed uncle Ramesh to pay it. Tag the one family member who fights for the bill like it's the finals.`,
  },
  {
    id: 'emotional',
    label: 'Emotional storytelling script',
    niche: 'Mental Health',
    platform: 'Instagram Reels',
    script: `My grandmother called me every Sunday at 4pm for eleven years. I missed the last one because I was "too busy" editing a video that got 200 views. She passed that Thursday. For two years I couldn't open my camera roll because her contact photo was the first thing I'd see. Here's what grief taught me that hustle culture never will: nobody on their deathbed asks about your content calendar. Now I keep a rule — one phone-free dinner a week with someone I love, no exceptions, no reschedules. The work will wait. It always waits. The people don't. If someone came to your mind while watching this, that's not a coincidence. Call them today. Not tomorrow — today.`,
  },
  {
    id: 'sales',
    label: 'Sales script',
    niche: 'B2B SaaS',
    platform: 'LinkedIn',
    script: `Your sales team is losing 11 hours a week to manual CRM updates — that's a full workday of selling time, gone. We measured it across 40 mid-market teams before building Pipeline Pilot. It listens to your sales calls, drafts the CRM entry, updates the deal stage, and writes the follow-up email — all before your rep hangs up. Athena Logistics cut their admin time by 63% in the first month and booked 22% more demos with the hours they got back. It plugs into Salesforce and HubSpot in under ten minutes, and your data never trains anyone else's models. We onboard five new teams each week so support stays hands-on. Book a 15-minute walkthrough at the link — if we don't find your team at least 6 recoverable hours in the first week, we'll say so and part friends.`,
  },
];

function mmssToSeconds(ts: string): number | null {
  const match = ts.match(/(\d{1,2}):(\d{2})(?!.*\d:)/); // last MM:SS in the string
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function collectConfidences(results: any): number[] {
  const sections = ['executive_summary', 'hook_analysis', 'retention_analysis', 'script_analysis', 'editing_analysis', 'emotion_analysis', 'growth_analysis'];
  return sections
    .map((s) => results?.[s]?.confidence)
    .filter((c): c is number => typeof c === 'number');
}

async function main() {
  const connectivityOnly = process.argv.includes('--connectivity-only');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { checkAllProviders } = await import('../lib/ai/health');
  const { runCreatorIntelligenceAnalysis } = await import('../lib/ai/engine');
  const { AiUnavailableError } = await import('../lib/ai/errors');

  console.log('════════ 1. PROVIDER CONNECTIVITY ════════');
  const health = await checkAllProviders();
  for (const p of health) {
    const state = !p.configured
      ? 'NOT CONFIGURED'
      : p.authValid
        ? 'HEALTHY (auth OK)'
        : `UNHEALTHY (${p.error ?? 'unknown'})`;
    console.log(`  ${p.provider.padEnd(10)} model=${p.model.padEnd(22)} ${state}`);
  }
  const healthyProviders = health.filter((p) => p.configured && p.authValid === true);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'connectivity.json'), JSON.stringify({ checkedAt: new Date().toISOString(), health }, null, 2));

  if (healthyProviders.length === 0) {
    console.log('\n❌ BLOCKED: no provider passed authentication.');
    console.log('   Replace ANTHROPIC_API_KEY / OPENAI_API_KEY in .env.local with valid keys');
    console.log('   from an active billed account, then re-run: npm run validate:ai');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'validation-summary.json'),
      JSON.stringify({ status: 'BLOCKED_NO_HEALTHY_PROVIDER', checkedAt: new Date().toISOString(), health }, null, 2)
    );
    process.exit(2);
  }
  if (connectivityOnly) {
    console.log('\n✅ Connectivity OK (—connectivity-only, skipping LLM validation)');
    process.exit(0);
  }

  console.log('\n════════ 2. FIVE-SCRIPT LLM VALIDATION ════════');
  const runs: Array<{ test: TestScript; results: any; meta: any }> = [];
  const problems: string[] = [];
  const warnings: string[] = [];

  for (const testScript of TEST_SCRIPTS) {
    process.stdout.write(`  ▶ ${testScript.label} … `);
    try {
      const { results, meta } = await runCreatorIntelligenceAnalysis({
        niche: testScript.niche,
        platform: testScript.platform,
        script: testScript.script,
      });
      runs.push({ test: testScript, results, meta });
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `report-${testScript.id}.json`),
        JSON.stringify({ test: testScript.label, meta, results }, null, 2)
      );
      console.log(
        `OK — score ${results.overall_score}/10 via ${meta.generationSource}/${meta.model} ` +
          `(${meta.latencyMs} ms, ${meta.promptTokens}+${meta.completionTokens} tok, ~$${meta.estimatedCostUsd ?? '?'})`
      );
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        problems.push(`${testScript.id}: AI unavailable — ${err.message}`);
        console.log('FAILED (AI unavailable)');
      } else {
        problems.push(`${testScript.id}: ${err instanceof Error ? err.message : String(err)}`);
        console.log('FAILED');
      }
    }
  }

  console.log('\n════════ 3. CONTENT-SENSITIVITY CHECKS ════════');
  if (runs.length === TEST_SCRIPTS.length) {
    // 3a. Distinctness: key creative fields must differ across all five reports.
    for (const field of [
      (r: any) => r.hook_analysis?.current_hook,
      (r: any) => r.hook_analysis?.suggested_rewrite_1,
      (r: any) => r.growth_analysis?.recommended_caption,
      (r: any) => r.executive_summary?.overall_verdict,
      (r: any) => r.rewrite_engine?.improved_version,
    ]) {
      const values = runs.map((r) => normalize(String(field(r.results) ?? '')));
      const unique = new Set(values.filter(Boolean));
      if (unique.size < runs.length) {
        problems.push(`distinctness: field ${field.toString().slice(0, 60)} repeated across reports`);
      }
    }
    console.log(`  distinctness across 5 reports: ${problems.length === 0 ? 'PASS' : 'see problems'}`);

    // 3b. Score discrimination: different-quality scripts should not share one score.
    const scores = runs.map((r) => r.results.overall_score);
    const spread = Math.max(...scores) - Math.min(...scores);
    console.log(`  overall scores: [${scores.join(', ')}] spread=${spread}`);
    if (new Set(scores).size === 1) problems.push(`score discrimination: all five scripts got identical overall_score=${scores[0]}`);
    else if (spread < 2) warnings.push(`score spread only ${spread} — verify calibration manually`);

    // 3c. Grounding: current_hook must quote the actual script.
    for (const run of runs) {
      const hook = normalize(String(run.results.hook_analysis?.current_hook ?? ''));
      const script = normalize(run.test.script);
      const probe = hook.split(' ').slice(0, 5).join(' ');
      if (!probe || !script.includes(probe)) {
        problems.push(`grounding: ${run.test.id} current_hook is not a verbatim quote ("${probe}…")`);
      }
    }
    console.log('  hook grounding (verbatim quotes): checked');

    // 3d. Duration-aware timelines: last segment must sit within/near actual duration.
    for (const run of runs) {
      const words = run.test.script.split(/\s+/).filter(Boolean).length;
      const estSeconds = Math.round((words / 150) * 60);
      const timeline = run.results.retention_analysis?.timeline_analysis ?? [];
      const last = timeline[timeline.length - 1]?.timestamp ?? '';
      const lastSeconds = mmssToSeconds(String(last));
      if (lastSeconds === null) {
        warnings.push(`timeline: ${run.test.id} last timestamp unparseable ("${last}")`);
      } else if (lastSeconds > estSeconds + 45) {
        problems.push(`timeline: ${run.test.id} timeline runs to ${lastSeconds}s but script is ~${estSeconds}s`);
      } else if (lastSeconds < estSeconds * 0.5) {
        warnings.push(`timeline: ${run.test.id} timeline covers only ${lastSeconds}s of ~${estSeconds}s`);
      }
    }
    console.log('  duration-aware timelines: checked');

    // 3e. Honest confidence: values must exist and must not be one flat constant.
    const allConfidences = runs.flatMap((r) => collectConfidences(r.results));
    const uniqueConfidences = new Set(allConfidences.map((c) => c.toFixed(2)));
    console.log(`  module confidences: n=${allConfidences.length}, distinct=${uniqueConfidences.size}`);
    if (allConfidences.length === 0) problems.push('confidence: no module confidence fields returned');
    else if (uniqueConfidences.size === 1) problems.push(`confidence: every module reported the same value (${Array.from(uniqueConfidences)[0]}) — not honest calibration`);

    // 3f. Evidence: every scored module should carry verbatim evidence quotes.
    for (const run of runs) {
      const sections = ['hook_analysis', 'retention_analysis', 'script_analysis', 'emotion_analysis', 'growth_analysis'];
      const missing = sections.filter((s) => !Array.isArray(run.results?.[s]?.evidence) || run.results[s].evidence.length === 0);
      if (missing.length > 0) warnings.push(`evidence: ${run.test.id} missing evidence arrays in ${missing.join(', ')}`);
    }
    console.log('  evidence arrays: checked');
  } else {
    problems.push(`only ${runs.length}/${TEST_SCRIPTS.length} scripts produced reports`);
  }

  const status = problems.length === 0 ? 'PASS' : 'FAIL';
  const summary = {
    status,
    checkedAt: new Date().toISOString(),
    healthyProviders: healthyProviders.map((p) => `${p.provider}:${p.model}`),
    runs: runs.map((r) => ({
      id: r.test.id,
      overallScore: r.results.overall_score,
      provider: r.meta.generationSource,
      model: r.meta.model,
      requestId: r.meta.requestId,
      latencyMs: r.meta.latencyMs,
      promptTokens: r.meta.promptTokens,
      completionTokens: r.meta.completionTokens,
      estimatedCostUsd: r.meta.estimatedCostUsd,
    })),
    problems,
    warnings,
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'validation-summary.json'), JSON.stringify(summary, null, 2));

  console.log(`\n════════ RESULT: ${status} ════════`);
  if (problems.length) console.log('Problems:\n' + problems.map((p) => `  ✗ ${p}`).join('\n'));
  if (warnings.length) console.log('Warnings:\n' + warnings.map((w) => `  ⚠ ${w}`).join('\n'));
  console.log(`Artifacts written to: ${OUTPUT_DIR}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Validation harness crashed:', err);
  process.exit(1);
});
