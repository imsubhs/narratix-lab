/**
 * Stage 8B — Canonical report model builder.
 *
 * buildReportModel() is the SINGLE place that maps a raw AnalysisResult (plus UI
 * context) into the format-agnostic ReportModel. Every export format renders
 * from the model this produces — so report content lives in exactly one place.
 *
 * Privacy contract (DO NOT EXPORT): this builder reads ONLY provenance-safe meta
 * fields — generation_source, provider, model, prompt_version, analysis_version,
 * file_name. It never reads request ids, latency, token counts, cost estimates,
 * telemetry, or secrets. Those fields exist on meta but are deliberately ignored
 * here, which is the only path any export can take.
 */
import { normalizeNaxResult, type AnalysisResult } from '../ai-engine-client';
import type {
  ExportContext,
  ReportBlock,
  ReportModel,
  ReportSection,
} from './types';

const BRAND = 'Narratix Lab';
const BRAND_TAGLINE = 'Creator Intelligence Report';

/** The exact demo-mode transparency sentence mandated by the product spec. */
export const DEMO_DISCLAIMER =
  'This report was generated in Narratix Lab Demonstration Mode. Measured metrics ' +
  'reflect the uploaded script while strategic insights come from validated ' +
  'demonstration profiles.';

/** Coerce any value to a trimmed display string, or a fallback when empty. */
function str(v: unknown, fallback = '—'): string {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : fallback;
  const s = String(v).trim();
  return s.length > 0 ? s : fallback;
}

function scoreStr(score: unknown, max = 10): string {
  const n = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(n)) return '—';
  return `${(Math.round(n * 10) / 10).toFixed(1)} / ${max}`;
}

function formatDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const safe = isNaN(d.getTime()) ? new Date() : d;
  return safe.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatConfidence(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  if (n <= 1) return `${Math.round(n * 100)}%`;
  if (n <= 10) return `${(Math.round(n * 10) / 10).toFixed(1)} / 10`;
  return `${Math.round(n)}%`;
}

/** Push a paragraph block only when the value is meaningfully present. */
function pushParagraph(blocks: ReportBlock[], label: string, value: unknown) {
  const text = str(value, '');
  if (text) blocks.push({ kind: 'paragraph', label, text });
}

interface ModuleSpec {
  key: string;
  label: string;
  data: Record<string, any> | undefined;
}

export function buildReportModel(
  rawResult: AnalysisResult,
  context: ExportContext = {}
): ReportModel {
  const result = (normalizeNaxResult(rawResult) ?? rawResult) as AnalysisResult;
  const meta = ((result as any)?.meta ?? {}) as Record<string, any>;
  const demo = (result as any)?.demo as Record<string, any> | undefined;

  // Provenance-safe source detection (snake_case from persistence, camelCase
  // from a fresh in-session run) — never touches telemetry fields.
  const source = meta.generation_source ?? meta.generationSource;
  const isDemo = source === 'demo' || !!demo;

  const intel = result.intelligence ?? ({} as any);
  const doc = result.document_intelligence ?? ({} as any);

  const niche = context.niche || str(intel.niche, 'General');
  const platform = context.platform || str(intel.platform, 'General');
  const goal = context.goal || str(intel.goal, '—');
  const scriptName =
    context.scriptName || str(meta.file_name, '') || `${niche} Script`;

  // ── Header identity fields ─────────────────────────────────────────────
  const headerFields: ReportModel['headerFields'] = [
    { label: 'Script Name', value: scriptName },
    { label: 'Platform', value: platform },
    { label: 'Niche', value: str(intel.sub_niche) !== '—' ? `${niche} · ${intel.sub_niche}` : niche },
    { label: 'Goal', value: goal },
    { label: 'Overall Score', value: scoreStr(result.overall_score) },
    { label: 'Confidence', value: formatConfidence(intel.confidence_score) },
    { label: 'Generated', value: formatDate(context.createdAt) },
  ];

  const sections: ReportSection[] = [];

  // ── 1. Executive Summary ───────────────────────────────────────────────
  {
    const es = result.executive_summary ?? ({} as any);
    const blocks: ReportBlock[] = [];
    pushParagraph(blocks, 'Verdict', result.overall_verdict || es.overall_verdict);
    pushParagraph(blocks, 'Strengths', es.strengths);
    pushParagraph(blocks, 'Weaknesses', es.weaknesses);
    pushParagraph(blocks, 'Recommendations', es.recommendations);
    pushParagraph(blocks, 'Priority Fixes', es.priority_fixes);
    if (blocks.length) sections.push({ id: 'executive-summary', heading: 'Executive Summary', blocks });
  }

  const modules: ModuleSpec[] = [
    { key: 'hook', label: 'Hook', data: result.hook_analysis as any },
    { key: 'retention', label: 'Retention', data: result.retention_analysis as any },
    { key: 'script', label: 'Script', data: result.script_analysis as any },
    { key: 'editing', label: 'Editing', data: result.editing_analysis as any },
    { key: 'emotion', label: 'Emotion', data: result.emotion_analysis as any },
    { key: 'growth', label: 'Growth', data: result.growth_analysis as any },
  ];

  // ── 2. Module Scores ───────────────────────────────────────────────────
  {
    const rows = modules
      .filter((m) => m.data)
      .map((m) => ({
        label: m.label,
        value: scoreStr(m.data?.score ?? (result.modules as any)?.[m.key]?.score),
        score: Number(m.data?.score ?? (result.modules as any)?.[m.key]?.score),
      }));
    if (rows.length) {
      sections.push({
        id: 'module-scores',
        heading: 'Module Scores',
        blocks: [{ kind: 'scoreTable', columns: ['Module', 'Score'], rows }],
      });
    }
  }

  // ── 3. Benchmarks & Predictions ────────────────────────────────────────
  {
    const hook = (result.hook_analysis ?? {}) as any;
    const ret = (result.retention_analysis ?? {}) as any;
    const scr = (result.script_analysis ?? {}) as any;
    const growth = (result.growth_analysis ?? {}) as any;
    const pairs: Array<{ label: string; value: string }> = [];
    const add = (label: string, value: unknown, suffix = '') => {
      const v = str(value, '');
      if (v) pairs.push({ label, value: `${v}${suffix}` });
    };
    add('Scroll-Stop Probability', hook.scroll_stop_probability);
    if (typeof hook.predicted_swipe_away_percent === 'number')
      add('Predicted Swipe-Away', hook.predicted_swipe_away_percent, '%');
    add('Completion Prediction', ret.completion_prediction);
    add('Attention Decay', ret.attention_decay_prediction);
    add('Structure Score', typeof scr.structure_score === 'number' ? `${scr.structure_score} / 10` : '');
    add('Clarity Score', typeof scr.clarity_score === 'number' ? `${scr.clarity_score} / 10` : '');
    add('Authority Score', typeof scr.authority_score === 'number' ? `${scr.authority_score} / 10` : '');
    add('Viral Trigger Type', growth.viral_trigger_type);
    if (pairs.length) {
      sections.push({
        id: 'benchmarks',
        heading: 'Benchmarks & Predictions',
        blocks: [{ kind: 'keyValue', pairs }],
      });
    }
  }

  // ── 4. Evidence ────────────────────────────────────────────────────────
  {
    const hook = (result.hook_analysis ?? {}) as any;
    const scr = (result.script_analysis ?? {}) as any;
    const blocks: ReportBlock[] = [];
    pushParagraph(blocks, 'Detected Hook', doc.detected_hook || hook.current_hook);
    pushParagraph(blocks, 'Detected CTA', doc.detected_cta);
    pushParagraph(blocks, 'Hook Type', hook.hook_type);
    pushParagraph(blocks, 'Hook Failure Reason', hook.failure_reason);
    pushParagraph(blocks, 'Consultant Summary', scr.consultant_summary);
    if (blocks.length) sections.push({ id: 'evidence', heading: 'Evidence', blocks });
  }

  // ── 5. Detailed Module Analysis ────────────────────────────────────────
  for (const m of modules) {
    if (!m.data) continue;
    const d = m.data;
    const blocks: ReportBlock[] = [
      { kind: 'paragraph', label: 'Score', text: scoreStr(d.score) },
    ];
    pushParagraph(blocks, 'Strengths', d.strengths);
    pushParagraph(blocks, 'Weaknesses', d.weaknesses);
    pushParagraph(blocks, 'Recommendations', d.recommendations);
    pushParagraph(blocks, 'Priority Fixes', d.priority_fixes);
    // Module-specific highlights.
    if (m.key === 'retention') pushParagraph(blocks, 'Retention Curve', d.retention_curve_summary);
    if (m.key === 'editing') {
      pushParagraph(blocks, 'Pacing', d.pacing_analysis);
      pushParagraph(blocks, 'Cut Frequency', d.cut_frequency);
    }
    if (m.key === 'growth') {
      pushParagraph(blocks, 'Recommended Caption', d.recommended_caption);
      if (Array.isArray(d.hashtag_cluster) && d.hashtag_cluster.length)
        pushParagraph(blocks, 'Hashtags', d.hashtag_cluster.join(' '));
      pushParagraph(blocks, 'Distribution Strategy', d.distribution_strategy);
    }
    sections.push({ id: `module-${m.key}`, heading: `${m.label} Analysis`, blocks });
  }

  // ── 6. Recommendations (aggregated) ────────────────────────────────────
  {
    const items: string[] = [];
    const es = result.executive_summary ?? ({} as any);
    if (str(es.recommendations, '')) items.push(str(es.recommendations));
    for (const m of modules) {
      const rec = str(m.data?.recommendations, '');
      if (rec) items.push(`${m.label}: ${rec}`);
    }
    if (items.length) {
      sections.push({
        id: 'recommendations',
        heading: 'Recommendations',
        blocks: [{ kind: 'list', ordered: false, items }],
      });
    }
  }

  // ── 7. Action Plan ─────────────────────────────────────────────────────
  {
    const items: string[] = [];
    const es = result.executive_summary ?? ({} as any);
    if (str(es.priority_fixes, '')) items.push(str(es.priority_fixes));
    for (const m of modules) {
      const fix = str(m.data?.priority_fixes, '');
      if (fix) items.push(`${m.label}: ${fix}`);
    }
    // Growth checklist / demo next-steps, when present.
    const checklist = (result.modules as any)?.growth?.checklist;
    if (Array.isArray(checklist)) items.push(...checklist.map((c: string) => str(c)));
    const nextSteps = demo?.variation?.nextSteps;
    if (Array.isArray(nextSteps)) items.push(...nextSteps.map((s: string) => str(s)));
    if (items.length) {
      sections.push({
        id: 'action-plan',
        heading: 'Action Plan',
        blocks: [{ kind: 'list', ordered: true, items }],
      });
    }
  }

  // ── 8. Confidence & Metadata ───────────────────────────────────────────
  {
    const pairs: Array<{ label: string; value: string }> = [];
    const add = (label: string, value: unknown) => {
      const v = str(value, '');
      if (v) pairs.push({ label, value: v });
    };
    add('Detection Confidence', formatConfidence(intel.confidence_score));
    add('Content Type', intel.content_type);
    add('Audience', intel.audience);
    add('Funnel Stage', intel.funnel_stage);
    add('Word Count', typeof doc.words === 'number' ? String(doc.words) : '');
    add('Reading Time', typeof doc.reading_time_minutes === 'number' ? `${doc.reading_time_minutes} min` : '');
    if (pairs.length) {
      sections.push({
        id: 'metadata',
        heading: 'Confidence & Metadata',
        blocks: [{ kind: 'keyValue', pairs }],
      });
    }
  }

  // ── Transparency footer ────────────────────────────────────────────────
  const transparency: ReportModel['transparency'] = isDemo
    ? {
        isDemo: true,
        title: 'Demonstration Mode Notice',
        body: DEMO_DISCLAIMER,
        provenance: demo?.profile_label
          ? [{ label: 'Demonstration Profile', value: str(demo.profile_label) }]
          : [],
      }
    : {
        isDemo: false,
        title: 'Generated by Narratix Intelligence Engine',
        body: 'Generated by Narratix Intelligence Engine.',
        provenance: [
          { label: 'Provider', value: str(meta.provider) },
          { label: 'Model', value: str(meta.model) },
          { label: 'Prompt Version', value: str(meta.prompt_version ?? meta.promptVersion) },
          { label: 'Analysis Version', value: str(meta.analysis_version ?? meta.analysisVersion) },
        ],
      };

  return {
    brand: { name: BRAND, tagline: BRAND_TAGLINE },
    title: `${niche} · ${platform}`,
    generatedDate: formatDate(context.createdAt),
    headerFields,
    overall: {
      score: Number.isFinite(result.overall_score) ? result.overall_score : 0,
      max: 10,
      verdict: str(result.overall_verdict, ''),
    },
    sections,
    transparency,
    demoBadge: isDemo,
  };
}
