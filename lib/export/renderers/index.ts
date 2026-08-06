/**
 * Stage 8B — Renderer registry.
 *
 * Every supported format is registered here as { descriptor, render }. The
 * ExportService is format-agnostic: it builds the canonical model once, looks up
 * the renderer by id, and calls render(model). Adding ODT/EPUB later means
 * appending ONE entry to this registry — the model, builder, service, and UI
 * never change.
 */
import type { ExportFormatDescriptor, ExportFormatId, ReportModel } from '../types';
import { renderMarkdown } from './markdown';
import { renderText } from './text';
import { renderHtml } from './html';
import { renderRtf } from './rtf';
import { renderPdf } from './pdf';
import { renderDocx } from './docx';

export interface FormatRenderer {
  descriptor: ExportFormatDescriptor;
  /** Render the canonical model to a downloadable Blob. */
  render: (model: ReportModel) => Promise<Blob>;
}

/** Wrap a string renderer as a text/* Blob producer. */
function textRenderer(
  descriptor: ExportFormatDescriptor,
  fn: (m: ReportModel) => string
): FormatRenderer {
  return {
    descriptor,
    render: async (model) => new Blob([fn(model)], { type: `${descriptor.mimeType};charset=utf-8` }),
  };
}

export const RENDERERS: Record<ExportFormatId, FormatRenderer> = {
  pdf: {
    descriptor: {
      id: 'pdf',
      label: 'PDF Document',
      extension: 'pdf',
      mimeType: 'application/pdf',
      description: 'Branded, print-ready, fixed-layout document.',
      recommendedUse: 'Sharing with clients, printing, and archiving.',
      binary: true,
    },
    render: async (model) => renderPdf(model),
  },
  docx: {
    descriptor: {
      id: 'docx',
      label: 'Microsoft Word',
      extension: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      description: 'Fully editable Word document with styles and tables.',
      recommendedUse: 'Editing, adding notes, and collaborative review.',
      binary: true,
    },
    render: async (model) => renderDocx(model),
  },
  md: textRenderer(
    {
      id: 'md',
      label: 'Markdown',
      extension: 'md',
      mimeType: 'text/markdown',
      description: 'Lightweight plain-text markup with headings and tables.',
      recommendedUse: 'Docs, wikis, GitHub, and static site publishing.',
      binary: false,
    },
    renderMarkdown
  ),
  html: textRenderer(
    {
      id: 'html',
      label: 'HTML Page',
      extension: 'html',
      mimeType: 'text/html',
      description: 'Self-contained styled web page with inline branding.',
      recommendedUse: 'Web embedding, email, and browser viewing.',
      binary: false,
    },
    renderHtml
  ),
  txt: textRenderer(
    {
      id: 'txt',
      label: 'Plain Text',
      extension: 'txt',
      mimeType: 'text/plain',
      description: 'Universal unformatted text — opens anywhere.',
      recommendedUse: 'Maximum compatibility and quick reading.',
      binary: false,
    },
    renderText
  ),
  rtf: textRenderer(
    {
      id: 'rtf',
      label: 'Rich Text',
      extension: 'rtf',
      mimeType: 'application/rtf',
      description: 'Portable formatted document for any word processor.',
      recommendedUse: 'Opening in Word, Pages, or WordPad without conversion.',
      binary: false,
    },
    renderRtf
  ),
};

/** Order the formats are presented in the export modal. */
export const FORMAT_ORDER: ExportFormatId[] = ['pdf', 'docx', 'md', 'html', 'txt', 'rtf'];
