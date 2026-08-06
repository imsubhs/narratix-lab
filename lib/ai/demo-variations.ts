/**
 * Demo Presentation Variation (Stage 7B) — DETERMINISTIC, NOT AI, NOT ANALYSIS.
 *
 * Improves demo replayability without pretending to generate AI and without
 * fabricating a single word of analysis. It rotates ONLY cosmetic *framing*
 * copy that wraps the report — the kind of navigational / motivational text a
 * product surface shows around results:
 *
 *   • opening summary  — how to read the report (no scores, no findings)
 *   • action-plan intro — a label above the recommended running order
 *   • next-steps        — how to USE the report (which section to start with)
 *   • conclusion        — a generic closing note
 *   • encouragement     — a generic motivational line
 *
 * None of these contain scores, evidence, quotations, or claims about the
 * user's specific script — those all live in the curated profile and are never
 * touched here. This layer is purely presentational.
 *
 * Determinism: the variant is chosen from a stable hash of (script + profileId).
 * The SAME script always receives the SAME variation; DIFFERENT scripts
 * naturally receive different variations. There is no randomness.
 */

/** Bumped when the report *presentation* (not the analysis) changes. */
export const REPORT_VERSION = '1.1.0';

export interface DemoVariation {
  /** 0-based index into the shared pool cadence, surfaced for auditability. */
  variantId: number;
  opening: string;
  actionPlanIntro: string;
  nextSteps: string[];
  conclusion: string;
  encouragement: string;
}

// ── Cosmetic copy pools ──────────────────────────────────────────────────────
// Every entry is generic framing. It never asserts anything about the user's
// script, never states a score, and never fabricates a finding.

const OPENINGS: string[] = [
  'This report maps your script across seven Creator Intelligence dimensions — hook, retention, structure, emotion, strategy, rewrite and growth. Read it top to bottom; each section builds on the one before it.',
  'What follows is a full-funnel read of your script: why the opening earns attention, where retention is won or lost, and which single change moves the most. Skim the scores, then dig into the Priority Fixes.',
  'Below is a structured breakdown of how this script is likely to perform and why. The scores summarise; the written sections explain the reasoning behind each one.',
  'This is a diagnostic pass, not a rewrite. Each dimension isolates one lever of performance so you can see exactly where the leverage is before you touch a word.',
  'Think of this as a second pair of expert eyes on your script — measuring the hook, the pacing, the emotional arc and the growth mechanics, then pointing at the highest-impact edits.',
];

const ACTION_PLAN_INTROS: string[] = [
  'Recommended running order',
  'Where to start',
  'Your fastest path to a stronger cut',
  'Work these in sequence',
  'Highest-leverage first',
];

const NEXT_STEPS_POOL: string[][] = [
  [
    'Start with the Hook section — it has the largest effect on watch-through.',
    'Apply the Priority Fixes before anything cosmetic.',
    'Re-read the Retention timeline and shore up the weakest segment.',
  ],
  [
    'Read the Executive Summary, then jump straight to Priority Fixes.',
    'Rewrite the opening using one of the suggested hook variations.',
    'Check the Growth section for a caption and CTA you can ship today.',
  ],
  [
    'Fix the single weakest segment flagged in Retention first.',
    'Layer in the missing emotion called out in the Emotion section.',
    'Use the Rewrite Engine’s improved opening as your new draft line one.',
  ],
  [
    'Compare your current opening against the three suggested rewrites.',
    'Tighten any segment marked as an attention-decay point.',
    'Finish with the Growth checklist — caption, hashtags, comment trigger.',
  ],
  [
    'Triage with the Priority Fixes list — it is ordered by impact.',
    'Strengthen the hook, then re-run your script to compare scores.',
    'Ship the recommended caption and CTA from the Growth section.',
  ],
];

const CONCLUSIONS: string[] = [
  'You now have a prioritised, section-by-section view of what is working and what to change next. The gap between a good script and a great one is usually three deliberate edits.',
  'Treat the Priority Fixes as your shortlist. Make them, re-run the script, and watch how the scores move — iteration is where the gains compound.',
  'Every section here points at one lever. Pull the highest-impact one first; you rarely need to change everything at once.',
  'The strongest creators do not guess — they diagnose, edit, and measure. This report is the diagnose step; the next move is yours.',
  'Use this as a repeatable checklist. Scripts that get reviewed before they ship consistently outperform scripts that do not.',
];

const ENCOURAGEMENTS: string[] = [
  'Small structural tweaks compound. Creators who iterate weekly outpace those who post and hope.',
  'You are closer than the score suggests — most of the distance is in the first three seconds.',
  'Great scripts are edited, not written. You already have the raw material; this is the polish pass.',
  'Consistency beats intensity. Ship the fix, learn from the next one, repeat.',
  'The best time to tighten a hook is before you hit publish. You are doing exactly that.',
];

/**
 * Stable 32-bit FNV-1a hash — deterministic across runs and machines. No
 * Math.random, no Date; the same string always hashes to the same number.
 */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts, kept in the unsigned range.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic non-negative index for a pool from a salted hash. */
function pick(base: number, salt: number, length: number): number {
  return ((base ^ (salt >>> 0)) >>> 0) % length;
}

/**
 * Build the deterministic cosmetic variation for a demo report.
 * @param script    the user's actual submitted script (drives per-script variety)
 * @param profileId the curated profile id (drives per-profile variety)
 */
export function buildDemoVariation(script: string, profileId: string): DemoVariation {
  const base = fnv1a(`${profileId}::${script}`);
  // Distinct salts (small primes) so sections rotate independently rather than
  // all moving together — different scripts feel genuinely different.
  const opening = OPENINGS[pick(base, 0x9e37, OPENINGS.length)];
  const actionPlanIntro = ACTION_PLAN_INTROS[pick(base, 0x1b3f, ACTION_PLAN_INTROS.length)];
  const nextSteps = NEXT_STEPS_POOL[pick(base, 0x2c9d, NEXT_STEPS_POOL.length)];
  const conclusion = CONCLUSIONS[pick(base, 0x3d71, CONCLUSIONS.length)];
  const encouragement = ENCOURAGEMENTS[pick(base, 0x517b, ENCOURAGEMENTS.length)];

  return {
    variantId: base % 1000,
    opening,
    actionPlanIntro,
    nextSteps,
    conclusion,
    encouragement,
  };
}
