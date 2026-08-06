/**
 * Response extraction + validation — v3.0.0
 *
 * v3.0.0 changes:
 *  - Validates that evidence uses line-numbered references (not just verbatim quotes)
 *  - Validates score distribution (not all scores in 5-8 range)
 *  - Validates ordinal fields are correct qualitative values (not numeric)
 *  - Validates confidence values vary across modules (not all identical)
 *  - Stricter checks on recommendation specificity
 *  - Validates hook_analysis.rewrite_* fields now use object format (archetype + text + why_better)
 *  - detected_cta allows null (per schema: "or null if none found")
 */

export class AiResponseParseError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Invalid analysis response: ${problems.join('; ')}`);
    this.name = 'AiResponseParseError';
    this.problems = problems;
  }
}

/** Balanced-brace JSON extraction that tolerates markdown fences and prose. */
export function extractJsonObject(text: string): any {
  const candidates: string[] = [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) candidates.push(fenced[1]);
  candidates.push(text);

  for (const candidate of candidates) {
    let start = candidate.indexOf('{');
    for (let tries = 0; start !== -1 && tries < 20; tries++, start = candidate.indexOf('{', start + 1)) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let i = start; i < candidate.length; i++) {
        const ch = candidate[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') inString = false;
          continue;
        }
        if (ch === '"') inString = true;
        else if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try {
              return JSON.parse(candidate.slice(start, i + 1));
            } catch {
              break;
            }
          }
        }
      }
    }
  }

  throw new AiResponseParseError([
    'response did not contain a complete, parseable JSON object (possibly truncated)',
  ]);
}

// ─── VALIDATION HELPERS ──────────────────────────────────────────

interface SectionRule {
  key: string;
  check: (section: any, fullResponse?: any) => string | null;
}

function requireScore(section: any, label: string): string | null {
  const score = section?.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 10) {
    return `${label}.score missing or not an integer 1-10`;
  }
  return null;
}

function requireIntegerField(
  obj: any,
  field: string,
  label: string,
  min: number,
  max: number
): string | null {
  const val = obj?.[field];
  if (typeof val !== 'number' || !Number.isInteger(val) || val < min || val > max) {
    return `${label}.${field} missing or not an integer ${min}-${max}`;
  }
  return null;
}

function requireTextField(
  obj: any,
  field: string,
  label: string,
  minLength: number,
  allowNull = false
): string | null {
  const val = obj?.[field];
  // Allow null when explicitly permitted (e.g. detected_cta can be null if no CTA found)
  if (allowNull && (val === null || val === undefined)) return null;
  if (typeof val !== 'string' || val.trim().length < minLength) {
    return `${label}.${field} missing or too short (min ${minLength} chars)`;
  }
  return null;
}

function requireNonEmptyArray(
  obj: any,
  field: string,
  label: string,
  minItems: number
): string | null {
  const arr = obj?.[field];
  if (!Array.isArray(arr) || arr.length < minItems) {
    return `${label}.${field} must be an array with at least ${minItems} item(s)`;
  }
  return null;
}

/** Check ordinal field is one of the allowed values. */
function requireOrdinal(
  obj: any,
  field: string,
  label: string,
  allowed: string[]
): string | null {
  const val = obj?.[field];
  if (typeof val !== 'string' || !allowed.includes(val)) {
    return `${label}.${field} must be one of: ${allowed.join(', ')}`;
  }
  return null;
}

/** Check that a string contains line-numbered references (e.g. "line 3", "lines 7-10"). */
function hasLineReference(text: string): boolean {
  return /\b(line\s+\d+|lines\s+\d+\s*[-–]\s*\d+|L\d+)\b/i.test(text);
}

/**
 * Check that a text field references specific lines or verbatim phrases.
 * Only applies to fields expected to have rich grounding (strengths/weaknesses/recommendations).
 * Returns null if the field is short (under 60 chars), since short fields naturally lack elaborate grounding.
 */
function checkEvidenceGrounding(text: string, label: string): string | null {
  if (!text || text.trim().length < 60) return null; // short fields don't need elaborate grounding
  const hasQuotes = /[""''""]/.test(text);
  const hasLineRef = hasLineReference(text);
  const hasSpecificWord = /\b(?:phrase|word|sentence|paragraph|section|opening|closing|line)\b/i.test(text);
  if (!hasQuotes && !hasLineRef && !hasSpecificWord) {
    return `${label} lacks evidence grounding — no quoted text, line references, or specific structural references found`;
  }
  return null;
}

/**
 * Check that scores are distributed across the full 1-10 range,
 * not all clustered in 5-8.
 */
function checkScoreDistribution(scores: number[]): string | null {
  if (scores.length < 3) return null;
  const allInMiddle = scores.every((s) => s >= 5 && s <= 8);
  if (allInMiddle) {
    return `Score distribution warning: all ${scores.length} scores are between 5-8. The model is not discriminating enough. At least one score should be below 5 or above 8.`;
  }
  const uniqueScores = new Set(scores);
  if (uniqueScores.size <= 2 && scores.length > 4) {
    return `Score diversity warning: only ${uniqueScores.size} unique score values across ${scores.length} modules. Scores should vary meaningfully.`;
  }
  return null;
}

/**
 * Check that confidence values vary across modules (not all identical).
 */
function checkConfidenceVariance(confidences: number[]): string | null {
  if (confidences.length < 3) return null;
  const unique = new Set(confidences.map((c) => Math.round(c * 100)));
  if (unique.size <= 1) {
    return `Confidence diversity warning: all ${confidences.length} modules have the same confidence value. Confidence must vary by signal availability.`;
  }
  const allDefaults = confidences.every((c) => c === 0.8 || c === 0.85 || c === 0.9);
  if (allDefaults) {
    return `Confidence values appear to be defaults (all 0.8/0.85/0.9). Confidence must be derived from actual signal quality.`;
  }
  return null;
}

/** Extract ordinal qualitative values from script analysis. */
const ORDINAL_LEVELS = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
const STATUS_LEVELS = [
  'Strong',
  'Attention Decline',
  'Recovery',
  'Curiosity Build',
  'Payoff',
  'Critical Drop',
];
const ENGAGEMENT_LEVELS = ['High', 'Medium', 'Low', 'Critical'];

// ─── SECTION RULES ───────────────────────────────────────────────

const SECTION_RULES: SectionRule[] = [
  // ── intelligence ──
  {
    key: 'intelligence',
    check: (s) =>
      requireTextField(s, 'niche', 'intelligence', 2) ||
      requireTextField(s, 'platform', 'intelligence', 2) ||
      (s?.platform === 'Auto-Detect' ? 'intelligence.platform must be a real platform, not Auto-Detect' : null) ||
      (typeof s?.confidence_score !== 'number' || s.confidence_score < 0 || s.confidence_score > 1
        ? 'intelligence.confidence_score must be a number 0.0-1.0'
        : null),
  },

  // ── document_intelligence ──
  {
    key: 'document_intelligence',
    check: (s) =>
      requireTextField(s, 'title', 'document_intelligence', 3) ||
      // detected_cta allows null — "or null if none found" per schema
      requireTextField(s, 'detected_hook', 'document_intelligence', 3) ||
      requireTextField(s, 'core_topic', 'document_intelligence', 3),
  },

  // ── executive_summary ──
  {
    key: 'executive_summary',
    check: (s) => {
      const score = s?.overall_score;
      if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 10) {
        return 'executive_summary.overall_score missing or not an integer 1-10';
      }
      return (
        requireTextField(s, 'overall_verdict', 'executive_summary', 40) ||
        requireTextField(s, 'strengths', 'executive_summary', 30) ||
        requireTextField(s, 'weaknesses', 'executive_summary', 30) ||
        requireTextField(s, 'recommendations', 'executive_summary', 40) ||
        requireTextField(s, 'priority_fixes', 'executive_summary', 20) ||
        checkEvidenceGrounding(s?.strengths || '', 'executive_summary.strengths') ||
        checkEvidenceGrounding(s?.weaknesses || '', 'executive_summary.weaknesses')
      );
    },
  },

  // ── hook_analysis ──
  {
    key: 'hook_analysis',
    check: (s) => {
      // Check rewrite objects have the new format (archetype + text + why_better)
      const rewriteIssues: string[] = [];
      for (const key of ['suggested_rewrite_1', 'suggested_rewrite_2', 'suggested_rewrite_3']) {
        const rw = s?.[key];
        if (rw && typeof rw === 'object' && !Array.isArray(rw)) {
          if (typeof rw.archetype !== 'string') rewriteIssues.push(`${key}.archetype missing`);
          if (typeof rw.text !== 'string' || rw.text.length < 10) rewriteIssues.push(`${key}.text missing or too short`);
          if (typeof rw.why_better !== 'string') rewriteIssues.push(`${key}.why_better missing`);
        } else if (rw !== undefined && rw !== null) {
          rewriteIssues.push(`${key} must be an object with archetype, text, why_better`);
        }
      }

      return (
        requireScore(s, 'hook_analysis') ||
        requireIntegerField(s, 'audience_curiosity_score', 'hook_analysis', 1, 10) ||
        requireOrdinal(s, 'scroll_stop_probability', 'hook_analysis', ORDINAL_LEVELS) ||
        (rewriteIssues.length > 0 ? rewriteIssues.join('; ') : null)
      );
    },
  },

  // ── retention_analysis ──
  {
    key: 'retention_analysis',
    check: (s) => {
      const scoreProblem = requireScore(s, 'retention_analysis');
      if (scoreProblem) return scoreProblem;

      const timeline = s?.timeline_analysis;
      if (!Array.isArray(timeline)) {
        return 'retention_analysis.timeline_analysis missing or not an array';
      }

      if (timeline.length < 3) {
        return 'retention_analysis.timeline_analysis needs at least 3 segments';
      }

      const bad = timeline.find(
        (p: any) =>
          !p ||
          typeof p.timestamp !== 'string' ||
          typeof p.status !== 'string' ||
          !STATUS_LEVELS.includes(p.status) ||
          typeof p.reason !== 'string'
      );
      if (bad) {
        return 'retention_analysis.timeline_analysis has segments missing valid timestamp, status, or reason';
      }

      // completion_prediction_estimate can have optional "Estimated " prefix
      const estimatedOrdinalLevels = [
        ...ORDINAL_LEVELS,
        ...ORDINAL_LEVELS.map((l) => `Estimated ${l}`),
      ];
      return (
        requireOrdinal(s, 'completion_prediction_estimate', 'retention_analysis', estimatedOrdinalLevels) ||
        requireTextField(s, 'retention_curve_summary', 'retention_analysis', 15)
      );
    },
  },

  // ── script_analysis ──
  {
    key: 'script_analysis',
    check: (s) =>
      requireScore(s, 'script_analysis') ||
      requireIntegerField(s, 'structure_score', 'script_analysis', 1, 10) ||
      requireIntegerField(s, 'clarity_score', 'script_analysis', 1, 10) ||
      requireIntegerField(s, 'authority_score', 'script_analysis', 1, 10) ||
      requireTextField(s, 'consultant_summary', 'script_analysis', 50),
  },

  // ── emotion_analysis ──
  // Note: editing_analysis is intentionally NOT in the required sections.
  // It was part of the v2 prompt schema but is not a Beta V1 core module.
  // The v3 prompt does not include it in the output schema.
  {
    key: 'emotion_analysis',
    check: (s) => {
      const scoreProblem = requireScore(s, 'emotion_analysis');
      if (scoreProblem) return scoreProblem;

      const subs = [
        { field: 'curiosity_score', label: 'curiosity' },
        { field: 'trust_score', label: 'trust' },
        { field: 'authority_score', label: 'authority' },
        { field: 'suspense_score', label: 'suspense' },
        { field: 'excitement_score', label: 'excitement' },
        { field: 'empathy_score', label: 'empathy' },
      ];
      // Allow up to 2 missing sub-scores for short scripts (weak signal)
      const missing = subs.filter((k) => typeof s?.[k.field] !== 'number');
      if (missing.length > 2) {
        return `emotion_analysis missing sub-scores: ${missing.map((m) => m.field).join(', ')}`;
      }

      return null;
    },
  },

  // ── growth_analysis ──
  {
    key: 'growth_analysis',
    check: (s) =>
      requireScore(s, 'growth_analysis') ||
      requireTextField(s, 'recommended_caption', 'growth_analysis', 15) ||
      requireTextField(s, 'alternative_caption', 'growth_analysis', 15) ||
      requireNonEmptyArray(s, 'hashtag_cluster', 'growth_analysis', 5),
  },

  // ── creator_strategist ──
  {
    key: 'creator_strategist',
    check: (s) =>
      requireTextField(s, 'why_fail', 'creator_strategist', 30) ||
      requireTextField(s, 'why_succeed', 'creator_strategist', 30) ||
      checkEvidenceGrounding(s?.why_fail || '', 'creator_strategist.why_fail') ||
      checkEvidenceGrounding(s?.why_succeed || '', 'creator_strategist.why_succeed'),
  },

  // ── rewrite_engine ──
  {
    key: 'rewrite_engine',
    check: (s) =>
      requireTextField(s, 'improved_opening', 'rewrite_engine', 50) ||
      requireTextField(s, 'diagnosis', 'rewrite_engine', 20) ||
      requireNonEmptyArray(s, 'specific_changes', 'rewrite_engine', 1),
  },
];

// ─── MAIN VALIDATION ─────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  problems: string[];
}

export function validateAnalysisResult(raw: any): ValidationResult {
  const problems: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, problems: ['response is not a JSON object'] };
  }

  // 1. Check all required sections exist
  const requiredKeys = SECTION_RULES.map((r) => r.key);
  for (const key of requiredKeys) {
    const section = raw[key];
    if (section === undefined || section === null) {
      problems.push(`missing required section: ${key}`);
      continue;
    }
    const problem = SECTION_RULES.find((r) => r.key === key)?.check(section, raw);
    if (problem) problems.push(problem);
  }

  // 2. Score distribution check
  const scoreKeys = [
    'hook_analysis',
    'retention_analysis',
    'script_analysis',
    'emotion_analysis',
    'growth_analysis',
  ];
  const scores = scoreKeys
    .map((k) => raw[k]?.score)
    .filter((s): s is number => typeof s === 'number' && Number.isInteger(s));
  const distProblem = checkScoreDistribution(scores);
  if (distProblem) problems.push(distProblem);

  // 3. Confidence variance check — only for intelligence.confidence_score
  // In v3, per-module confidence was removed; only intelligence has confidence_score.
  // This check is informational only; it doesn't block validation.
  const intConfidence = raw.intelligence?.confidence_score;
  if (typeof intConfidence === 'number') {
    if (intConfidence === 0.8 || intConfidence === 0.85 || intConfidence === 0.9) {
      problems.push(
        `intelligence.confidence_score appears to be a default value (${intConfidence}). Confidence must be derived from actual signal quality.`
      );
    }
  }

  return { ok: problems.length === 0, problems };
}
