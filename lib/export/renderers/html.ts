/**
 * Stage 8B — HTML renderer. Emits a self-contained, print-friendly document
 * with inline Narratix Lab branding. Walks the canonical ReportModel.
 */
import type { ReportBlock, ReportModel } from '../types';

const BRAND_RED = '#7C3AED'; // Narratix Lab Electric Violet

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function block(b: ReportBlock): string {
  switch (b.kind) {
    case 'paragraph':
      return `<p>${b.label ? `<strong>${esc(b.label)}:</strong> ` : ''}${esc(b.text)}</p>`;
    case 'keyValue':
      return (
        `<dl class="kv">` +
        b.pairs
          .map((p) => `<div><dt>${esc(p.label)}</dt><dd>${esc(p.value)}</dd></div>`)
          .join('') +
        `</dl>`
      );
    case 'scoreTable':
      return (
        `<table><thead><tr><th>${esc(b.columns[0])}</th><th>${esc(b.columns[1])}</th></tr></thead><tbody>` +
        b.rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`).join('') +
        `</tbody></table>`
      );
    case 'list':
      return (
        `<${b.ordered ? 'ol' : 'ul'}>` +
        b.items.map((it) => `<li>${esc(it)}</li>`).join('') +
        `</${b.ordered ? 'ol' : 'ul'}>`
      );
    case 'callout':
      return `<div class="callout ${b.tone}">${b.title ? `<strong>${esc(b.title)}</strong> ` : ''}${esc(b.text)}</div>`;
    default:
      return '';
  }
}

export function renderHtml(model: ReportModel): string {
  const sections = model.sections
    .map(
      (s) =>
        `<section><h2>${esc(s.heading)}</h2>${s.blocks.map(block).join('\n')}</section>`
    )
    .join('\n');

  const provenance = model.transparency.provenance.length
    ? `<dl class="kv">${model.transparency.provenance
        .map((p) => `<div><dt>${esc(p.label)}</dt><dd>${esc(p.value)}</dd></div>`)
        .join('')}</dl>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(model.brand.name)} — ${esc(model.title)}</title>
<style>
  :root { --red:${BRAND_RED}; --ink:#0f172a; --muted:#475569; --line:#e5e7eb; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink); line-height:1.6; max-width:820px; margin:0 auto; padding:48px 32px; }
  header { border-bottom:3px solid var(--red); padding-bottom:16px; margin-bottom:24px; }
  .brand { color:var(--red); font-weight:800; font-size:26px; letter-spacing:.5px; }
  .tagline { color:var(--muted); font-size:14px; }
  h1 { font-size:20px; margin:8px 0 0; }
  h2 { font-size:16px; color:var(--red); border-bottom:1px solid var(--line); padding-bottom:6px; margin-top:32px; }
  .badge { display:inline-block; background:rgba(124,58,237,.1); color:var(--red);
    border:1px solid rgba(124,58,237,.3); border-radius:999px; padding:3px 12px; font-size:12px; font-weight:700; margin-top:8px; }
  .score-card { background:#fbf7ff; border:1px solid var(--red); border-radius:10px; padding:18px 22px; margin:18px 0; }
  .score-card .num { color:var(--red); font-size:40px; font-weight:800; line-height:1; }
  .kv { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; margin:8px 0; }
  .kv div { display:flex; justify-content:space-between; border-bottom:1px dashed var(--line); padding:4px 0; }
  .kv dt { color:var(--muted); font-weight:600; margin:0; }
  .kv dd { margin:0; font-weight:600; text-align:right; }
  table { width:100%; border-collapse:collapse; margin:12px 0; }
  th,td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-size:13px; text-transform:uppercase; letter-spacing:.4px; }
  p { margin:6px 0; }
  ul,ol { margin:8px 0; padding-left:22px; }
  li { margin:4px 0; }
  .transparency { margin-top:40px; border-top:2px solid var(--line); padding-top:16px; font-size:14px; color:var(--muted); }
  .transparency h3 { color:var(--ink); font-size:15px; margin-bottom:6px; }
  footer { margin-top:32px; text-align:center; color:#94a3b8; font-size:12px; font-style:italic; }
  @media print { body { padding:0; } }
</style>
</head>
<body>
<header>
  <div class="brand">${esc(model.brand.name.toUpperCase())}</div>
  <div class="tagline">${esc(model.brand.tagline)}</div>
  <h1>${esc(model.title)}</h1>
  ${model.demoBadge ? '<span class="badge">Demonstration Mode</span>' : ''}
</header>

<div class="kv">
  ${model.headerFields.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}
</div>

<div class="score-card">
  <div class="num">${model.overall.score.toFixed(1)}<span style="font-size:18px;color:var(--muted)"> / ${model.overall.max}</span></div>
  ${model.overall.verdict ? `<p>${esc(model.overall.verdict)}</p>` : ''}
</div>

${sections}

<div class="transparency">
  <h3>${esc(model.transparency.title)}</h3>
  <p>${esc(model.transparency.body)}</p>
  ${provenance}
</div>

<footer>Generated by ${esc(model.brand.name)}.</footer>
</body>
</html>`;
}
