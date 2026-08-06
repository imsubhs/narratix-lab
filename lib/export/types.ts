/**
 * Stage 8B — Professional Export System.
 *
 * The canonical, format-agnostic report model. EVERY export format is rendered
 * from this single structure — there is no per-format re-reading of the raw
 * AnalysisResult and no duplicated rendering logic. Adding a new format (ODT,
 * EPUB, …) means adding ONE renderer that walks these generic blocks; the model
 * and the builder never change.
 *
 * The builder (report-model.ts) is the ONLY place that decides WHAT goes into a
 * report. Renderers only decide HOW a generic block looks in their format.
 */

/** Stable identifier for every supported export format. */
export type ExportFormatId = 'pdf' | 'docx' | 'md' | 'html' | 'txt' | 'rtf';

/** Human-facing metadata for a format, surfaced in the export modal. */
export interface ExportFormatDescriptor {
  id: ExportFormatId;
  label: string;
  /** File extension WITHOUT the leading dot. */
  extension: string;
  mimeType: string;
  /** One-line description of the format. */
  description: string;
  /** Who/what this format is best suited for. */
  recommendedUse: string;
  /** True when the renderer emits binary bytes (PDF/DOCX); false for text. */
  binary: boolean;
}

// ─── Generic document blocks ────────────────────────────────────────────────
// A report is a tree of sections, each holding an ordered list of these blocks.
// Renderers implement a small visitor over the block union — nothing more.

export interface ParagraphBlock {
  kind: 'paragraph';
  /** Optional inline bold label, e.g. "Diagnosis: …". */
  label?: string;
  text: string;
}

export interface KeyValueBlock {
  kind: 'keyValue';
  pairs: Array<{ label: string; value: string }>;
}

export interface ScoreTableBlock {
  kind: 'scoreTable';
  columns: [string, string];
  rows: Array<{ label: string; value: string; score?: number }>;
}

export interface ListBlock {
  kind: 'list';
  ordered: boolean;
  items: string[];
}

/** A framed notice — used for the demo disclaimer and live provenance footer. */
export interface CalloutBlock {
  kind: 'callout';
  tone: 'demo' | 'provenance';
  title?: string;
  text: string;
}

export type ReportBlock =
  | ParagraphBlock
  | KeyValueBlock
  | ScoreTableBlock
  | ListBlock
  | CalloutBlock;

export interface ReportSection {
  id: string;
  heading: string;
  blocks: ReportBlock[];
}

/** Transparency footer — demo disclaimer OR live provenance (never both). */
export interface TransparencyBlock {
  isDemo: boolean;
  /** Heading shown above the notice. */
  title: string;
  /** The disclaimer / attribution sentence. */
  body: string;
  /** Live-mode provenance pairs (empty in demo mode). */
  provenance: Array<{ label: string; value: string }>;
}

/** The complete canonical report — the single source model for all formats. */
export interface ReportModel {
  brand: { name: string; tagline: string };
  title: string;
  generatedDate: string;
  /** Top-of-report identity fields (script name, platform, niche, goal, …). */
  headerFields: Array<{ label: string; value: string }>;
  overall: { score: number; max: number; verdict: string };
  sections: ReportSection[];
  transparency: TransparencyBlock;
  /** True when a "Demonstration Mode" badge must be shown. */
  demoBadge: boolean;
}

/** Contextual inputs supplied by the caller (UI) alongside the result. */
export interface ExportContext {
  niche?: string;
  platform?: string;
  goal?: string;
  scriptName?: string;
  createdAt?: string;
}

/** The rendered artifact ready for download. */
export interface RenderedExport {
  /** Blob suitable for URL.createObjectURL / anchor download. */
  blob: Blob;
  filename: string;
  mimeType: string;
}
