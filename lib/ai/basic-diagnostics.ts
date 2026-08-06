/**
 * Basic Creator Diagnostics — the honest replacement for the Stage 1 fallback
 * engine (createFallbackAnalysis).
 *
 * HARD RULES (Stage 2 success criteria):
 *  - Only directly measurable facts about the submitted text.
 *  - No 1-10 scores, no percentages, no benchmarks, no predictions,
 *    no template "recommendations", no fabricated confidence.
 *  - Every derived number states its arithmetic (e.g. the 150 wpm assumption).
 */

export interface BasicDiagnostics {
  wordCount: number;
  sentenceCount: number;
  characterCount: number;
  /** wordCount / 150 wpm — a stated assumption, not a prediction. */
  estimatedSpokenSeconds: number;
  readingTimeMinutes: number;
  opensWithQuestion: boolean;
  questionCount: number;
  /** Verbatim CTA phrases actually present in the text. */
  ctaPhrasesFound: string[];
  firstLine: string;
}

const CTA_PHRASES = [
  'follow',
  'subscribe',
  'comment',
  'share',
  'save this',
  'like this',
  'link in bio',
  'click',
  'sign up',
  'join',
  'learn more',
  'part two',
  'part 2',
  'dm me',
];

export function computeBasicDiagnostics(script: string): BasicDiagnostics {
  const text = script.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const lower = text.toLowerCase();
  const firstLine = (text.split(/\r?\n/, 1)[0] || '').slice(0, 120);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    characterCount: text.length,
    estimatedSpokenSeconds: Math.round((words.length / 150) * 60),
    readingTimeMinutes: Math.max(1, Math.round(words.length / 200)),
    opensWithQuestion: /^[^.!?]*\?/.test(text),
    questionCount: (text.match(/\?/g) || []).length,
    ctaPhrasesFound: CTA_PHRASES.filter((p) => lower.includes(p)),
    firstLine,
  };
}

/**
 * Plain-language rendering used in the user-facing "AI unavailable" message.
 * Deliberately reads as measurement, not intelligence.
 */
export function formatBasicDiagnostics(d: BasicDiagnostics): string {
  const parts = [
    `${d.wordCount} words across ${d.sentenceCount} sentences`,
    `roughly ${d.estimatedSpokenSeconds} seconds if spoken at 150 words per minute`,
    d.opensWithQuestion ? 'the script opens with a question' : 'the script opens with a statement',
    d.ctaPhrasesFound.length > 0
      ? `call-to-action wording found: ${d.ctaPhrasesFound.map((p) => `"${p}"`).join(', ')}`
      : 'no common call-to-action wording detected',
  ];
  return parts.join(' · ');
}
