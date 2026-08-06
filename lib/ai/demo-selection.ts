/**
 * Demo Selection Engine (Stage 7A) — DETERMINISTIC, NOT AI.
 *
 * Given a submitted script, this classifies the content style using transparent
 * lexical/structural heuristics (word count, sentence length, question density,
 * CTA/sales/narrative/educational/humor/emotional cues) and picks the closest
 * curated demonstration profile. There is no model call and no inference here —
 * it is a rules-based template chooser, and it says so.
 *
 * Output is fully explainable: `signals` and `rationale` are surfaced in the
 * report metadata so the choice is auditable.
 */
import type { AnalysisPromptContext } from './prompts';

export interface ContentSignals {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  questionCount: number;
  questionFrequency: number; // questions per sentence
  ctaScore: number;
  salesScore: number;
  narrativeScore: number;
  educationalScore: number;
  humorScore: number;
  emotionalScore: number;
  launchScore: number;
  tutorialScore: number;
  interviewScore: number;
  podcastScore: number;
  personalBrandScore: number;
}

const COUNT = (text: string, re: RegExp): number => (text.match(re) || []).length;

/** Compute transparent content signals from a raw script. */
export function computeSignals(script: string, context?: AnalysisPromptContext): ContentSignals {
  const text = script || '';
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);

  const platform = (context?.platform || '').toLowerCase();

  return {
    wordCount,
    sentenceCount,
    avgSentenceLength: Math.round((wordCount / sentenceCount) * 10) / 10,
    questionCount: COUNT(text, /\?/g),
    questionFrequency: Math.round((COUNT(text, /\?/g) / sentenceCount) * 100) / 100,

    ctaScore:
      COUNT(lower, /\b(link in bio|comment|subscribe|sign language?up|sign up|link below|dm me|save this|follow|shop|buy now|swipe up|tap the link|check the link)\b/g) +
      (/\bcomment\s+\w+/.test(lower) ? 1 : 0),

    salesScore:
      COUNT(text, /\$\d|\d+\s*%|\bfree\b|\bdiscount\b|\boffer\b|\bdeal\b|\bprice\b|\bsale\b|\border\b|\bbuy\b|\bfounder pricing\b|\blifetime\b/gi),

    narrativeScore:
      COUNT(lower, /\b(i|my|me|we|our)\b/g) * 0.2 +
      COUNT(lower, /\b(years? ago|months? ago|remember|that day|the last time|back then|used to|chapter one)\b/g) * 2,

    educationalScore:
      COUNT(lower, /\b(how to|here'?s why|here are|technique|study|science|research|learn|tip|the reason|understand|concept)\b/g) * 1.5 +
      COUNT(lower, /\b(first|second|third|number \d)\b/g) * 0.5,

    humorScore:
      COUNT(lower, /\b(pov|lol|literally|bruh|nobody:|me:|awkward|the way i|it me|relatable)\b/g) * 2 +
      (/pov:/.test(lower) ? 3 : 0),

    emotionalScore:
      COUNT(lower, /\b(love|loss|lost|cried|crying|tears|heart|grandmother|grandfather|fear|afraid|hope|grief|passed away|do not wait|someday|miss(ed)?)\b/g) * 1.5,

    launchScore:
      COUNT(lower, /\b(launch(ing)?|introducing|today we|announcing|version one|beta|signups?|we built|we are giving)\b/g) * 2,

    tutorialScore:
      COUNT(lower, /\b(step (one|two|three|four|five|1|2|3|4|5)|how to|first,|then,|finally,|next,)\b/g) * 1.5 +
      (/step (one|1)/.test(lower) ? 3 : 0),

    interviewScore:
      COUNT(lower, /\b(i asked|he said|she said|they said|answered|when i asked|what would you)\b/g) * 2.5,

    podcastScore:
      COUNT(lower, /\b(so here'?s the thing|the thing nobody|everyone talks about|nobody talks about|think about it|i tell (every|my))\b/g) * 2,

    personalBrandScore:
      COUNT(lower, /\b(i quit|my journey|betting on yourself|six figure|corporate job|i learned|control (my|your) (own )?schedule|bet on yourself)\b/g) * 2 +
      (platform.includes('linkedin') ? 1 : 0),
  };
}

/** Map a content style → a numeric affinity from the signals. */
const STYLE_MATCHERS: Array<{ style: string; score: (s: ContentSignals) => number }> = [
  { style: 'interview', score: (s) => s.interviewScore * 1.2 },
  { style: 'tutorial', score: (s) => s.tutorialScore },
  { style: 'product_launch', score: (s) => s.launchScore },
  { style: 'comedy', score: (s) => s.humorScore },
  { style: 'emotional', score: (s) => s.emotionalScore },
  { style: 'personal_brand', score: (s) => s.personalBrandScore },
  { style: 'podcast', score: (s) => s.podcastScore + (s.wordCount > 130 ? 1 : 0) },
  { style: 'storytelling', score: (s) => s.narrativeScore * 0.8 },
  { style: 'marketing', score: (s) => s.salesScore + s.ctaScore * 0.5 },
  { style: 'educational', score: (s) => s.educationalScore },
];

/**
 * Deterministic priority order for ties / near-empty signals. More specific
 * styles win over generic ones so a bare script still gets a sensible default.
 */
const PRIORITY: string[] = [
  'interview', 'tutorial', 'product_launch', 'comedy', 'emotional',
  'personal_brand', 'podcast', 'storytelling', 'marketing', 'educational',
];

export interface SelectionResult {
  style: string;
  matchScore: number;
  rationale: string;
  signals: ContentSignals;
  /** Ranked candidate styles with scores, for auditability. */
  ranked: Array<{ style: string; score: number }>;
}

/**
 * Select the best-matching curated profile style from those available.
 * @param availableStyles the styles that actually have a curated profile file.
 */
export function selectProfileStyle(
  script: string,
  context: AnalysisPromptContext,
  availableStyles: string[],
): SelectionResult {
  const signals = computeSignals(script, context);
  const available = new Set(availableStyles);

  const ranked = STYLE_MATCHERS
    .filter((m) => available.has(m.style))
    .map((m) => ({ style: m.style, score: Math.round(m.score(signals) * 100) / 100 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return PRIORITY.indexOf(a.style) - PRIORITY.indexOf(b.style);
    });

  // If nothing scored above zero, fall back to the highest-priority available
  // style (typically 'educational' — the most general explainer).
  const top = ranked[0] && ranked[0].score > 0
    ? ranked[0]
    : { style: [...PRIORITY].reverse().find((p) => available.has(p)) || availableStyles[0], score: 0 };

  const rationale =
    top.score > 0
      ? `Matched '${top.style}' (signal score ${top.score}) from ${signals.wordCount} words, ` +
        `${signals.questionCount} question(s), avg sentence ${signals.avgSentenceLength} words.`
      : `No strong style signal detected; defaulted to '${top.style}'.`;

  return { style: top.style, matchScore: top.score, rationale, signals, ranked };
}
