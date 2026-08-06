/**
 * Stage 8B — Microsoft Word (.docx) renderer (docx library). Editable, branded.
 * Walks the canonical ReportModel — no report content decisions are made here.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
} from 'docx';
import type { ReportBlock, ReportModel } from '../types';

const RED = 'D52122';
const INK = '1F2937';
const MUTED = '4B5563';
const GREY = '9CA3AF';
const FONT = 'Plus Jakarta Sans';
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' };

function labelledPara(label: string | undefined, text: string): Paragraph {
  const runs: TextRun[] = [];
  if (label) runs.push(new TextRun({ text: `${label}: `, bold: true, color: MUTED, font: FONT }));
  runs.push(new TextRun({ text, color: INK, font: FONT }));
  return new Paragraph({ spacing: { after: 80 }, children: runs });
}

function blockToParagraphs(b: ReportBlock): (Paragraph | Table)[] {
  switch (b.kind) {
    case 'paragraph':
      return [labelledPara(b.label, b.text)];
    case 'keyValue':
      return b.pairs.map((p) => labelledPara(p.label, p.value));
    case 'scoreTable':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: b.columns.map(
                (c) =>
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, font: FONT })] })],
                  })
              ),
            }),
            ...b.rows.map(
              (r) =>
                new TableRow({
                  children: [r.label, r.value].map(
                    (v) =>
                      new TableCell({
                        borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
                        children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT })] })],
                      })
                  ),
                })
            ),
          ],
        }),
        new Paragraph({ spacing: { after: 120 } }),
      ];
    case 'list':
      return b.items.map(
        (it, i) =>
          new Paragraph({
            spacing: { after: 60 },
            ...(b.ordered ? {} : { bullet: { level: 0 } }),
            children: [new TextRun({ text: b.ordered ? `${i + 1}. ${it}` : it, font: FONT })],
          })
      );
    case 'callout':
      return [labelledPara(b.title, b.text)];
  }
}

export async function renderDocx(model: ReportModel): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // ── Header ──
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 40 },
      children: [new TextRun({ text: model.brand.name, bold: true, size: 34, color: RED, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: model.brand.tagline, bold: true, size: 22, color: MUTED, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: model.demoBadge ? 40 : 240 },
      children: [new TextRun({ text: model.title, size: 20, color: MUTED, font: FONT })],
    })
  );
  if (model.demoBadge) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: 'DEMONSTRATION MODE', bold: true, size: 18, color: RED, font: FONT })],
      })
    );
  }

  // ── Header fields ──
  for (const f of model.headerFields) children.push(labelledPara(f.label, f.value));
  children.push(
    new Paragraph({
      spacing: { before: 160, after: 200 },
      children: [
        new TextRun({ text: 'Overall Score: ', bold: true, font: FONT }),
        new TextRun({
          text: `${model.overall.score.toFixed(1)} / ${model.overall.max}`,
          bold: true,
          color: RED,
          font: FONT,
        }),
      ],
    })
  );
  if (model.overall.verdict) children.push(labelledPara(undefined, model.overall.verdict));

  // ── Sections ──
  for (const section of model.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 120 },
        children: [new TextRun({ text: section.heading, bold: true, color: RED, font: FONT })],
      })
    );
    for (const b of section.blocks) children.push(...blockToParagraphs(b));
  }

  // ── Transparency footer ──
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 100 },
      children: [new TextRun({ text: model.transparency.title, bold: true, color: RED, font: FONT })],
    }),
    labelledPara(undefined, model.transparency.body)
  );
  for (const p of model.transparency.provenance) children.push(labelledPara(p.label, p.value));
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [new TextRun({ text: `Generated by ${model.brand.name}`, italics: true, size: 18, color: GREY, font: FONT })],
    })
  );

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBlob(doc);
}
