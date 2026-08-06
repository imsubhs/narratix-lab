/**
 * Demo Mode — Product Demonstration Engine (Stage 7A).
 *
 * When DEMO_MODE is enabled the AI engine never calls a provider. Instead it:
 *   1. Classifies the submitted script with a deterministic heuristic
 *      (lib/ai/demo-selection.ts — NOT AI).
 *   2. Selects the closest curated Creator Intelligence report from a library of
 *      professionally-varied profiles (lib/ai/demo-profiles/*.json). Each was
 *      captured from a real gpt-4o-mini run and hardened to pass the strict
 *      validator; the analytical prose is genuine, not fabricated.
 *   3. Personalizes ONLY honestly-measurable factual fields (platform, niche,
 *      goal, word/sentence counts, duration, detected hook/CTA, readability).
 *      Evidence, quotations and confidence are never fabricated or altered.
 *
 * This keeps the entire product UX — auth → dashboard → analyze → progress →
 * report → history → details — fully working for a beta/demo without burning API
 * credits or depending on a live model. The live provider pipeline
 * (lib/ai/engine.ts) stays fully wired: set DEMO_MODE=false to switch back to
 * real per-input AI with zero other changes.
 *
 * Honesty: meta.generationSource is stamped 'demo' and the route persists full
 * provenance, so a demo report is never misrepresented as a live generation.
 */
import type { AnalysisRunMeta } from './engine';
import type { AnalysisPromptContext } from './prompts';
import { PROMPT_VERSION } from './prompts';
import { ANALYSIS_VERSION } from './config';
import { validateAnalysisResult } from './validate';
import { selectProfileStyle, computeSignals } from './demo-selection';
import { buildDemoVariation, REPORT_VERSION } from './demo-variations';
import { normalizeNaxResult, type AnalysisResult } from '../ai-engine-client';

// ─── Curated profile library (static imports so Next bundles them) ───
import comedy from './demo-profiles/comedy.json';
import educational from './demo-profiles/educational.json';
import emotional from './demo-profiles/emotional.json';
import interview from './demo-profiles/interview.json';
import marketing from './demo-profiles/marketing.json';
import personalBrand from './demo-profiles/personal-brand.json';
import podcast from './demo-profiles/podcast.json';
import productLaunch from './demo-profiles/product-launch.json';
import storytelling from './demo-profiles/storytelling.json';
import tutorial from './demo-profiles/tutorial.json';

interface CuratedProfile {
  _profile: { id: string; label: string; style: string };
  [key: string]: any;
}

const ALL_PROFILES: CuratedProfile[] = [
  comedy, educational, emotional, interview, marketing,
  personalBrand, podcast, productLaunch, storytelling, tutorial,
] as unknown as CuratedProfile[];

/** style → curated report. */
const PROFILE_BY_STYLE = new Map<string, CuratedProfile>(
  ALL_PROFILES.map((p) => [p._profile.style, p]),
);

/** The sample script the demo library is representative of (used for UI prefill). */
export const DEMO_SAMPLE_SCRIPT = `Most people waste their entire twenties being broke for no reason.
I made every money mistake you can think of by the time I was 25.
Here is the one system that finally fixed it.
Every time you get paid, move 20 percent into a separate account before you touch anything.
Then automate your bills so you never think about them.
Whatever is left is yours to spend guilt free.
I went from zero savings to twelve thousand dollars in eight months doing exactly this.
Try it for one paycheck and comment DONE if you actually do it.`;

/** True when the server is configured to serve demo reports instead of live AI. */
export function isDemoMode(): boolean {
  return /^(1|true|yes|on)$/i.test((process.env.DEMO_MODE || '').trim());
}

function firstSentence(text: string): string {
  const s = text.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  return s[0] || text.slice(0, 120);
}

const CTA_RE =
  /\b(comment|follow|subscribe|link in bio|link below|save this|dm me|sign up|try it|share this|shop|buy|swipe up|tap the link|check the link)\b/i;

/** Honestly detect a CTA: the last sentence, only if it actually reads as one. */
function detectCta(text: string): { cta: string | null; words: number | null } {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const last = sentences[sentences.length - 1] || '';
  if (last && CTA_RE.test(last)) {
    return { cta: last, words: last.split(/\s+/).filter(Boolean).length };
  }
  return { cta: null, words: null };
}

/** Flesch Reading Ease (approx) — a standard, honestly-computed readability metric. */
function fleschReadingEase(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const W = Math.max(1, words.length);
  const S = Math.max(1, sentences.length);
  const score = 206.835 - 1.015 * (W / S) - 84.6 * (syllables / W);
  return Math.round(score * 10) / 10;
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (w.endsWith('e') && n > 1) n -= 1;
  return Math.max(1, n);
}

/**
 * Build the demo report for a request: select the closest curated profile, then
 * align only honestly-measurable factual fields to the actual submission.
 */
export function buildDemoAnalysis(context: AnalysisPromptContext): {
  results: AnalysisResult;
  meta: AnalysisRunMeta;
} {
  const availableStyles = Array.from(PROFILE_BY_STYLE.keys());
  const selection = selectProfileStyle(context.script, context, availableStyles);
  const chosen = PROFILE_BY_STYLE.get(selection.style) ?? ALL_PROFILES[0];

  // Deep clone so the frozen template is never mutated across requests.
  const report: any = JSON.parse(JSON.stringify(chosen));
  const profileMeta = report._profile;
  delete report._profile;

  // ── Align only neutral, non-analytical context fields to the request ──
  if (context.niche) report.intelligence.niche = context.niche;
  if (context.platform && context.platform !== 'Auto-Detect') {
    report.intelligence.platform = context.platform;
  }
  if (context.goal) report.intelligence.goal = context.goal;

  // ── Recompute measurable document metrics from the ACTUAL script ──
  const words = context.script.split(/\s+/).filter(Boolean).length;
  const sentences = context.script.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  if (words > 0) {
    const hook = firstSentence(context.script);
    const { cta, words: ctaWords } = detectCta(context.script);
    Object.assign(report.document_intelligence, {
      words,
      sentences,
      reading_time_minutes: Math.max(1, Math.ceil(words / 200)),
      estimated_spoken_seconds: Math.round((words / 150) * 60),
      detected_hook: hook,
      hook_word_count: hook.split(/\s+/).filter(Boolean).length,
      detected_cta: cta,
      cta_word_count: ctaWords,
      readability_flesch: fleschReadingEase(context.script),
    });
  }

  // Safety net: a curated report must always validate.
  const validation = validateAnalysisResult(report);
  if (!validation.ok) {
    throw new Error(`Demo report failed validation: ${validation.problems.join('; ')}`);
  }

  const model = `demo/${profileMeta.id}`;
  const meta: AnalysisRunMeta = {
    generationSource: 'demo',
    provider: 'demo',
    analysisVersion: ANALYSIS_VERSION,
    model,
    requestId: null,
    latencyMs: 0,
    promptTokens: null,
    completionTokens: null,
    estimatedCostUsd: 0,
    promptVersion: PROMPT_VERSION,
    fallbackTriggered: false,
    attempts: [
      {
        provider: 'demo' as any,
        model,
        outcome: 'success',
        status: 200,
        requestId: null,
        latencyMs: 0,
        error: null,
      },
    ],
  };

  const results = normalizeNaxResult(report);
  // Attach the demonstration provenance so the UI can render a transparency card
  // and the choice stays auditable. This lives under a dedicated namespace so it
  // never collides with report content.
  // Deterministic cosmetic framing (opening/next-steps/conclusion/etc.). This
  // rotates presentation copy only — never scores, evidence or findings — so the
  // same script always renders identically and different scripts feel distinct.
  const variation = buildDemoVariation(context.script, profileMeta.id);

  (results as any).demo = {
    profile_id: profileMeta.id,
    profile_label: profileMeta.label,
    profile_style: profileMeta.style,
    match_score: selection.matchScore,
    rationale: selection.rationale,
    signals: selection.signals,
    ranked: selection.ranked,
    report_version: REPORT_VERSION,
    variation,
  };

  return { results, meta };
}

export { computeSignals };
