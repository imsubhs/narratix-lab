/**
 * AI pipeline unit/regression tests — offline, no network, no API keys.
 * Run: npm run test:ai
 *
 * Covers the Stage 2 success criteria at the engine level:
 *  - strict extraction/validation (no padded or partial reports)
 *  - typed error taxonomy and provider waterfall
 *  - circuit breaker on auth failures
 *  - AiUnavailableError on total failure (never a fabricated report)
 *  - Basic Creator Diagnostics contains measured facts only
 */
import assert from 'node:assert/strict';
import { extractJsonObject, validateAnalysisResult, AiResponseParseError } from '../lib/ai/validate';
import { computeBasicDiagnostics, formatBasicDiagnostics } from '../lib/ai/basic-diagnostics';
import { runCreatorIntelligenceAnalysis } from '../lib/ai/engine';
import { AiUnavailableError, ProviderError, sanitizeErrorMessage } from '../lib/ai/errors';
import { closeCircuit } from '../lib/ai/health';
import type { ChatMessage, ProviderAdapter, ProviderResponse } from '../lib/ai/providers/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    failures.push(`${name}: ${message}`);
    console.log(`  ❌ ${name}\n     ${message}`);
  }
}

/**
 * Minimal raw response satisfying every v3.0.0 validation rule
 * (see lib/ai/validate.ts SECTION_RULES). Module scores are deliberately
 * spread across the 1-10 range so checkScoreDistribution passes.
 */
function makeValidRaw(seed = 'alpha'): any {
  const rewrite = (n: number) => ({
    archetype: `Curiosity Gap ${n}`,
    text: `Rewritten hook option ${n} for ${seed} that is long enough.`,
    why_better: `Front-loads the payoff and raises stakes (option ${n}).`,
  });
  return {
    intelligence: { niche: `niche-${seed}`, sub_niche: 'sub', goal: 'growth', audience: 'creators', content_type: 'educational', platform: 'TikTok', funnel_stage: 'Top', confidence_score: 0.72 },
    document_intelligence: { pages: 1, words: 100, reading_time_minutes: 1, title: `Title ${seed}`, detected_hook: `Opening hook of ${seed}`, detected_cta: null, key_promise: 'a key promise', main_conflict: 'a conflict', core_topic: `core topic ${seed}` },
    executive_summary: { overall_score: 6, overall_verdict: `A specific, evidence-grounded verdict for ${seed} that is clearly long enough.`, strengths: 'Clear structure and confident delivery.', weaknesses: 'Weak CTA; pacing sags mid-script badly.', recommendations: 'Tighten the middle and add a stronger CTA at the end of the video.', priority_fixes: 'Rewrite the closing CTA now.' },
    hook_analysis: { score: 4, hook_type: 'Curiosity Gap', current_hook: `opening line of ${seed}`, failure_reason: 'buries the payoff', audience_curiosity_score: 5, scroll_stop_probability: 'Moderate', suggested_rewrite_1: rewrite(1), suggested_rewrite_2: rewrite(2), suggested_rewrite_3: rewrite(3) },
    retention_analysis: { score: 6, timeline_analysis: [
      { timestamp: '00:00–00:05', status: 'Strong', engagement_level: 'High', reason: 'strong open', recommended_fix: 'f1' },
      { timestamp: '00:05–00:15', status: 'Attention Decline', engagement_level: 'Low', reason: 'momentum dips', recommended_fix: 'f2' },
      { timestamp: '00:15–00:30', status: 'Recovery', engagement_level: 'Medium', reason: 'story picks up', recommended_fix: 'f3' },
      { timestamp: '00:30–00:40', status: 'Payoff', engagement_level: 'High', reason: 'clear payoff', recommended_fix: 'f4' },
    ], completion_prediction_estimate: 'Moderate', retention_curve_summary: 'Dips at 10s then recovers.' },
    script_analysis: { score: 7, structure_score: 6, clarity_score: 7, authority_score: 5, audience_fit: 'good', consultant_summary: `A sufficiently long consulting summary for ${seed} covering structure and retention leaks in detail.` },
    emotion_analysis: { score: 8, curiosity_score: 6, trust_score: 5, authority_score: 6, suspense_score: 4, excitement_score: 6, empathy_score: 5, emotional_timeline: [{ timestamp: '00:00', emotion: 'Curiosity' }] },
    creator_strategist: { why_fail: `Buries the payoff so viewers drop early in ${seed}.`, why_succeed: `Strong topical hook and confident tone in ${seed}.`, audience_perception: 'a', algorithm_perception: 'a', shareability_prediction: 's' },
    rewrite_engine: { improved_opening: `A complete rewritten opening for ${seed} that is definitely longer than fifty characters total.`, diagnosis: 'The opening lacks a clear stakes-driven hook.', specific_changes: ['Front-load the payoff'] },
    growth_analysis: { score: 9, recommended_caption: `Recommended caption for ${seed}`, alternative_caption: `Alternative caption for ${seed}`, hashtag_cluster: ['one', 'two', 'three', 'four', 'five'], content_category: 'c', audience_segment: 'a', viral_trigger_type: 'v' },
  };
}

function fakeAdapter(
  name: 'anthropic' | 'openai' | 'openrouter',
  behavior: (call: number, messages: ChatMessage[]) => ProviderResponse | Error
): ProviderAdapter & { calls: number } {
  const adapter = {
    name,
    model: `fake-${name}-model`,
    calls: 0,
    isConfigured: () => true,
    async invoke(_system: string, messages: ChatMessage[]): Promise<ProviderResponse> {
      adapter.calls++;
      const result = behavior(adapter.calls, messages);
      if (result instanceof Error) throw result;
      return result;
    },
  };
  return adapter;
}

const okResponse = (raw: any): ProviderResponse => ({
  text: JSON.stringify(raw),
  requestId: 'req_test',
  promptTokens: 1000,
  completionTokens: 2000,
  stopReason: 'end_turn',
});

const CONTEXT = { niche: 'fitness', platform: 'TikTok', script: 'Do you skip warmups? Follow for part two.' };

async function main() {
  console.log('\n— extractJsonObject —');
  await test('parses plain JSON', () => {
    assert.deepEqual(extractJsonObject('{"a":1}'), { a: 1 });
  });
  await test('parses fenced ```json blocks', () => {
    assert.deepEqual(extractJsonObject('Here you go:\n```json\n{"a":{"b":2}}\n```'), { a: { b: 2 } });
  });
  await test('parses JSON wrapped in prose with braces inside strings', () => {
    assert.deepEqual(extractJsonObject('note {ignored\nActual: {"a":"has } brace","b":1} done'), {
      a: 'has } brace',
      b: 1,
    });
  });
  await test('throws AiResponseParseError on truncated JSON', () => {
    assert.throws(() => extractJsonObject('{"a": {"b": 1'), AiResponseParseError);
  });

  console.log('\n— validateAnalysisResult —');
  await test('accepts a complete analysis', () => {
    assert.equal(validateAnalysisResult(makeValidRaw()).ok, true);
  });
  await test('rejects empty object (the old {} → fake-report path)', () => {
    const v = validateAnalysisResult({});
    assert.equal(v.ok, false);
    assert.ok(v.problems.length >= 8);
  });
  await test('rejects missing retention timeline', () => {
    const raw = makeValidRaw();
    raw.retention_analysis.timeline_analysis = [];
    assert.equal(validateAnalysisResult(raw).ok, false);
  });
  await test('rejects out-of-range overall_score', () => {
    const raw = makeValidRaw();
    raw.executive_summary.overall_score = 14;
    assert.equal(validateAnalysisResult(raw).ok, false);
  });

  console.log('\n— Basic Creator Diagnostics (honesty contract) —');
  await test('reports only measured facts', () => {
    const d = computeBasicDiagnostics('Do you skip warmups? Big mistake. Follow for part two, and comment below!');
    assert.equal(d.opensWithQuestion, true);
    assert.ok(d.ctaPhrasesFound.includes('follow'));
    assert.ok(d.ctaPhrasesFound.includes('comment'));
    assert.equal(d.wordCount, 13);
  });
  await test('contains no scores, percentages, confidence or benchmarks', () => {
    const d = computeBasicDiagnostics('A short test script.');
    const keys = Object.keys(d).join(' ').toLowerCase();
    for (const banned of ['score', 'percent', 'confidence', 'benchmark', 'prediction', 'probability']) {
      assert.ok(!keys.includes(banned), `field name contains banned concept: ${banned}`);
    }
    const text = formatBasicDiagnostics(d);
    assert.ok(!/\d+\s*%/.test(text), 'formatted diagnostics must not contain percentages');
    assert.ok(!/\/10/.test(text), 'formatted diagnostics must not contain X/10 scores');
  });

  console.log('\n— engine: provider waterfall —');
  await test('fails over from auth-failing provider to healthy provider', async () => {
    closeCircuit('anthropic'); closeCircuit('openai');
    const bad = fakeAdapter('anthropic', () => new ProviderError({ provider: 'anthropic', kind: 'auth', status: 401, message: 'invalid x-api-key' }));
    const good = fakeAdapter('openai', () => okResponse(makeValidRaw()));
    const { results, meta } = await runCreatorIntelligenceAnalysis(CONTEXT, { providers: [bad, good] });
    assert.equal(meta.generationSource, 'openai');
    assert.equal(meta.fallbackTriggered, false);
    assert.equal(meta.attempts[0].outcome, 'auth');
    assert.equal(meta.attempts[1].outcome, 'success');
    assert.equal(results.overall_score, 6);
  });
  await test('auth failure opens the circuit — provider skipped on next run', async () => {
    const bad = fakeAdapter('anthropic', () => new ProviderError({ provider: 'anthropic', kind: 'auth', status: 401, message: 'invalid x-api-key' }));
    const good = fakeAdapter('openai', () => okResponse(makeValidRaw()));
    const { meta } = await runCreatorIntelligenceAnalysis(CONTEXT, { providers: [bad, good] });
    assert.equal(meta.attempts[0].outcome, 'skipped_circuit_open');
    assert.equal(bad.calls, 0, 'circuit-open provider must not be called');
    closeCircuit('anthropic');
  });
  await test('invalid response triggers exactly one corrective re-ask, then succeeds', async () => {
    closeCircuit('anthropic'); closeCircuit('openai');
    const flaky = fakeAdapter('anthropic', (call, messages) => {
      if (call === 1) return { ...okResponse({}), text: '{"hello": "not an analysis"}' };
      assert.ok(messages.some((m) => m.content.includes('missing required section')), 'correction prompt must list problems');
      return okResponse(makeValidRaw());
    });
    const { meta } = await runCreatorIntelligenceAnalysis(CONTEXT, { providers: [flaky] });
    assert.equal(flaky.calls, 2);
    assert.equal(meta.attempts[0].outcome, 'invalid_response');
    assert.equal(meta.attempts[1].outcome, 'success');
  });
  await test('retries once on transient rate_limit then succeeds', async () => {
    closeCircuit('anthropic'); closeCircuit('openai');
    const flaky = fakeAdapter('anthropic', (call) =>
      call === 1
        ? new ProviderError({ provider: 'anthropic', kind: 'rate_limit', status: 429, message: 'rate limited' })
        : okResponse(makeValidRaw())
    );
    const { meta } = await runCreatorIntelligenceAnalysis(CONTEXT, { providers: [flaky] });
    assert.equal(flaky.calls, 2);
    assert.equal(meta.attempts[meta.attempts.length - 1]?.outcome, 'success');
  });

  console.log('\n— engine: OpenRouter provider —');
  await test('openrouter adapter produces a report and is recorded as the generation source', async () => {
    closeCircuit('openrouter');
    const openrouter = fakeAdapter('openrouter', () => okResponse(makeValidRaw('openrouter')));
    const { results, meta } = await runCreatorIntelligenceAnalysis(CONTEXT, { providers: [openrouter] });
    assert.equal(meta.generationSource, 'openrouter');
    assert.equal(meta.fallbackTriggered, false);
    assert.equal(meta.attempts[0].outcome, 'success');
    assert.equal(results.overall_score, 6);
  });
  await test('waterfall falls over from openrouter to a healthy provider on auth failure', async () => {
    closeCircuit('openrouter'); closeCircuit('anthropic');
    const bad = fakeAdapter('openrouter', () => new ProviderError({ provider: 'openrouter', kind: 'auth', status: 401, message: 'No auth credentials found' }));
    const good = fakeAdapter('anthropic', () => okResponse(makeValidRaw()));
    const { meta } = await runCreatorIntelligenceAnalysis(CONTEXT, { providers: [bad, good] });
    assert.equal(meta.attempts[0].outcome, 'auth');
    assert.equal(meta.generationSource, 'anthropic');
    closeCircuit('openrouter');
  });
  await test('default provider registry includes openrouter (config-driven order)', async () => {
    const { AI_CONFIG } = await import('../lib/ai/config');
    assert.ok(AI_CONFIG.providerOrder.includes('openrouter'), 'openrouter must be a registered provider');
    assert.equal(AI_CONFIG.openrouter.model, process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free');
  });

  console.log('\n— engine: no silent fallback, ever —');
  await test('throws AiUnavailableError when every provider fails (never returns a report)', async () => {
    closeCircuit('anthropic'); closeCircuit('openai');
    const bad1 = fakeAdapter('anthropic', () => new ProviderError({ provider: 'anthropic', kind: 'auth', status: 401, message: 'invalid x-api-key sk-ant-api03-SECRETSECRETSECRET' }));
    const bad2 = fakeAdapter('openai', () => new ProviderError({ provider: 'openai', kind: 'server_error', status: 500, message: 'boom' }));
    await assert.rejects(
      runCreatorIntelligenceAnalysis(CONTEXT, { providers: [bad1, bad2] }),
      AiUnavailableError
    );
    closeCircuit('anthropic'); closeCircuit('openai');
  });
  await test('throws AiUnavailableError when no provider is configured', async () => {
    const unconfigured = fakeAdapter('anthropic', () => okResponse(makeValidRaw()));
    unconfigured.isConfigured = () => false;
    await assert.rejects(
      runCreatorIntelligenceAnalysis(CONTEXT, { providers: [unconfigured] }),
      AiUnavailableError
    );
    assert.equal(unconfigured.calls, 0);
  });
  await test('persistently invalid responses end in AiUnavailableError, not a padded report', async () => {
    closeCircuit('anthropic'); closeCircuit('openai');
    const junk = fakeAdapter('anthropic', () => ({ ...okResponse({}), text: '{}' }));
    await assert.rejects(runCreatorIntelligenceAnalysis(CONTEXT, { providers: [junk] }), AiUnavailableError);
    assert.equal(junk.calls, 2, 'one initial call + one corrective re-ask');
  });

  console.log('\n— secret hygiene —');
  await test('error messages never carry API keys', () => {
    const cleaned = sanitizeErrorMessage('401 invalid key sk-ant-api03-AAAABBBBCCCCDDDD and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig');
    assert.ok(!cleaned.includes('AAAABBBBCCCCDDDD'));
    assert.ok(!cleaned.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
  });
  await test('ProviderError sanitizes its own message', () => {
    const err = new ProviderError({ provider: 'openai', kind: 'auth', status: 401, message: 'Incorrect API key provided: sk-proj-67zRw3SECRET' });
    assert.ok(!err.message.includes('67zRw3SECRET'));
  });

  console.log(`\n========================================`);
  console.log(`AI pipeline tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log(failures.map((f) => ` - ${f}`).join('\n'));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
