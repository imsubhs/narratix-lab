/**
 * Stage 8B — Export Service.
 *
 * The single entry point for ALL report exports. It:
 *   1. Builds the canonical ReportModel once (buildReportModel).
 *   2. Looks up the requested format's renderer in the registry.
 *   3. Renders to a Blob and (optionally) triggers a browser download.
 *
 * There is no per-format report logic anywhere in the app — every format shares
 * this pipeline and the same source model. New formats plug into the registry
 * (renderers/index.ts) without touching this service.
 */
import { buildReportModel } from './report-model';
import { RENDERERS, FORMAT_ORDER } from './renderers';
import type { AnalysisResult } from '../ai-engine-client';
import type {
  ExportContext,
  ExportFormatDescriptor,
  ExportFormatId,
  RenderedExport,
  ReportModel,
} from './types';

/** All supported formats, in presentation order — powers the export modal. */
export function getSupportedFormats(): ExportFormatDescriptor[] {
  return FORMAT_ORDER.map((id) => RENDERERS[id].descriptor);
}

export function isSupportedFormat(id: string): id is ExportFormatId {
  return id in RENDERERS;
}

/** Filesystem-safe base name for the downloaded file (no extension). */
function safeBaseName(model: ReportModel): string {
  const base = `Narratix_Report_${model.title}`
    .replace(/[·/\\:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return base || 'Narratix_Report';
}

/** Total character weight of the model — used for size estimation. */
function modelTextLength(model: ReportModel): number {
  let n = model.title.length + model.overall.verdict.length;
  for (const f of model.headerFields) n += f.label.length + f.value.length;
  for (const s of model.sections) {
    n += s.heading.length;
    for (const b of s.blocks) {
      if (b.kind === 'paragraph') n += (b.label?.length ?? 0) + b.text.length;
      else if (b.kind === 'keyValue') n += b.pairs.reduce((a, p) => a + p.label.length + p.value.length, 0);
      else if (b.kind === 'scoreTable') n += b.rows.reduce((a, r) => a + r.label.length + r.value.length, 0);
      else if (b.kind === 'list') n += b.items.reduce((a, it) => a + it.length, 0);
      else if (b.kind === 'callout') n += (b.title?.length ?? 0) + b.text.length;
    }
  }
  n += model.transparency.body.length;
  n += model.transparency.provenance.reduce((a, p) => a + p.label.length + p.value.length, 0);
  return n;
}

/**
 * Estimate an export's file size WITHOUT rendering all six formats. Multipliers
 * plus a fixed structural overhead per format give an honest "Estimated" figure
 * for the modal. Rendering the chosen format later yields the real bytes.
 */
export function estimateFileSize(rawResult: AnalysisResult, context: ExportContext = {}): Record<ExportFormatId, string> {
  const model = buildReportModel(rawResult, context);
  const t = modelTextLength(model);
  // { multiplier on text chars, fixed overhead in bytes }
  const weights: Record<ExportFormatId, [number, number]> = {
    txt: [1.05, 400],
    md: [1.15, 500],
    rtf: [1.7, 900],
    html: [2.4, 4200],
    pdf: [0.7, 15000],
    docx: [1.3, 9000],
  };
  const out = {} as Record<ExportFormatId, string>;
  for (const id of FORMAT_ORDER) {
    const [mult, overhead] = weights[id];
    out[id] = formatBytes(Math.round(t * mult + overhead));
  }
  return out;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Build the canonical model and render it to the requested format, returning the
 * Blob, filename and mime type. Does NOT touch the DOM.
 */
export async function generateExport(
  format: ExportFormatId,
  rawResult: AnalysisResult,
  context: ExportContext = {}
): Promise<RenderedExport> {
  const renderer = RENDERERS[format];
  if (!renderer) throw new Error(`Unsupported export format: ${format}`);
  const model = buildReportModel(rawResult, context);
  const blob = await renderer.render(model);
  return {
    blob,
    filename: `${safeBaseName(model)}.${renderer.descriptor.extension}`,
    mimeType: renderer.descriptor.mimeType,
  };
}

/**
 * Full browser export: generate + trigger a download. Safe no-op guard when
 * called outside the browser.
 */
export async function exportReport(
  format: ExportFormatId,
  rawResult: AnalysisResult,
  context: ExportContext = {}
): Promise<RenderedExport> {
  const rendered = await generateExport(format, rawResult, context);
  if (typeof document === 'undefined') return rendered;
  const url = URL.createObjectURL(rendered.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = rendered.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Release the object URL after the click has been processed.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return rendered;
}
