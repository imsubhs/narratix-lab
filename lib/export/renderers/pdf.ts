/**
 * Stage 8B — PDF renderer (jsPDF). Print-friendly, branded, paginated. Walks
 * the canonical ReportModel — no report content decisions are made here.
 */
import { jsPDF } from 'jspdf';
import type { ReportModel } from '../types';

const RED: [number, number, number] = [213, 33, 34];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [71, 85, 105];
const LINE: [number, number, number] = [229, 231, 235];

export function renderPdf(model: ReportModel): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15; // margin
  const contentW = pageW - M * 2;
  let y = 20;

  const ensure = (needed: number) => {
    if (y + needed > pageH - 18) {
      doc.addPage();
      y = 20;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...RED);
      doc.text(model.brand.name.toUpperCase(), M, y);
      doc.setDrawColor(...LINE);
      doc.line(M, y + 2, pageW - M, y + 2);
      y += 10;
    }
  };

  const wrapped = (text: string, size: number, lineH = 4.6): string[] => {
    doc.setFontSize(size);
    return doc.splitTextToSize(text, contentW) as string[];
  };

  const paragraph = (label: string | undefined, text: string) => {
    const full = label ? `${label}: ${text}` : text;
    const lines = wrapped(full, 10);
    ensure(lines.length * 4.6 + 3);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    // Bold label prefix drawn separately for emphasis.
    if (label) {
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(...MUTED);
      const labelText = `${label}: `;
      const labelW = doc.getTextWidth(labelText);
      doc.text(labelText, M, y);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(...INK);
      const rest = doc.splitTextToSize(text, contentW - labelW) as string[];
      doc.text(rest[0] ?? '', M + labelW, y);
      for (let i = 1; i < rest.length; i++) {
        y += 4.6;
        ensure(4.6);
        doc.text(rest[i], M, y);
      }
    } else {
      doc.text(lines, M, y);
      y += (lines.length - 1) * 4.6;
    }
    y += 6;
  };

  // ── Header ──
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...RED);
  doc.text(model.brand.name.toUpperCase(), M, y);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(model.generatedDate, pageW - M, y, { align: 'right' });
  y += 5;
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.6);
  doc.line(M, y, pageW - M, y);
  y += 9;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(model.brand.tagline, M, y);
  y += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(model.title, M, y);
  y += 6;

  if (model.demoBadge) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...RED);
    doc.text('DEMONSTRATION MODE', M, y);
    y += 6;
  }
  y += 2;

  // ── Header fields ──
  doc.setFontSize(10);
  model.headerFields.forEach((f) => {
    ensure(5.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text(`${f.label}:`, M, y);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...INK);
    doc.text(f.value, M + 42, y);
    y += 5.5;
  });
  y += 4;

  // ── Overall score card ──
  ensure(26);
  doc.setFillColor(255, 247, 229);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, contentW, 24, 3, 3, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...RED);
  doc.text('OVERALL SCORE', M + 5, y + 8);
  doc.setFontSize(26);
  doc.text(`${model.overall.score.toFixed(1)}`, M + 5, y + 19);
  if (model.overall.verdict) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const v = doc.splitTextToSize(model.overall.verdict, contentW - 55) as string[];
    doc.text(v.slice(0, 4), M + 40, y + 7);
  }
  y += 32;

  // ── Sections ──
  for (const section of model.sections) {
    ensure(12);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...RED);
    doc.text(section.heading.toUpperCase(), M, y);
    y += 3;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);
    y += 6;

    for (const b of section.blocks) {
      switch (b.kind) {
        case 'paragraph':
          paragraph(b.label, b.text);
          break;
        case 'keyValue':
          b.pairs.forEach((p) => paragraph(p.label, p.value));
          break;
        case 'scoreTable':
          b.rows.forEach((r) => {
            ensure(6);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...INK);
            doc.text(r.label, M, y);
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(...MUTED);
            doc.text(r.value, pageW - M, y, { align: 'right' });
            y += 6;
          });
          y += 2;
          break;
        case 'list':
          b.items.forEach((it, i) => {
            const prefix = b.ordered ? `${i + 1}. ` : '•  ';
            const lines = doc.splitTextToSize(prefix + it, contentW - 4) as string[];
            ensure(lines.length * 4.6 + 2);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...INK);
            doc.text(lines, M + 2, y);
            y += lines.length * 4.6 + 2;
          });
          y += 2;
          break;
        case 'callout':
          paragraph(b.title, b.text);
          break;
      }
    }
    y += 3;
  }

  // ── Transparency footer ──
  ensure(20);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(M, y, pageW - M, y);
  y += 7;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...RED);
  doc.text(model.transparency.title, M, y);
  y += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const bodyLines = doc.splitTextToSize(model.transparency.body, contentW) as string[];
  ensure(bodyLines.length * 4.4);
  doc.text(bodyLines, M, y);
  y += bodyLines.length * 4.4 + 3;
  model.transparency.provenance.forEach((p) => {
    ensure(5);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${p.label}: `, M, y);
    const w = doc.getTextWidth(`${p.label}: `);
    doc.setFont('Helvetica', 'normal');
    doc.text(p.value, M + w, y);
    y += 5;
  });

  // Bottom-of-page footer on every page.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated by ${model.brand.name}`, pageW / 2, pageH - 8, { align: 'center' });
    doc.text(`${i} / ${pages}`, pageW - M, pageH - 8, { align: 'right' });
  }

  return doc.output('blob');
}
