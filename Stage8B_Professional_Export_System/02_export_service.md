# Stage 8B — Export Service

`lib/export/export-service.ts` is the single entry point for every export in the
app. Nothing else renders reports.

## Public API (`@/lib/export`)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `getSupportedFormats()` | `() => ExportFormatDescriptor[]` | All formats, in modal order |
| `estimateFileSize(result, ctx)` | `=> Record<ExportFormatId, string>` | Human-readable size estimate per format |
| `generateExport(fmt, result, ctx)` | `=> Promise<RenderedExport>` | Build model + render → `{ blob, filename, mimeType }` (no DOM) |
| `exportReport(fmt, result, ctx)` | `=> Promise<RenderedExport>` | `generateExport` + browser download |
| `buildReportModel(result, ctx)` | `=> ReportModel` | The canonical model (exposed for tests/inspection) |
| `isSupportedFormat(id)` | type guard | Validate a format id |

`ExportContext = { niche?, platform?, goal?, scriptName?, createdAt? }` — optional
UI hints; every field falls back to values already inside the result.

## Pipeline

```ts
export async function generateExport(format, rawResult, context) {
  const renderer = RENDERERS[format];              // registry lookup
  const model = buildReportModel(rawResult, context); // ONE canonical model
  const blob = await renderer.render(model);       // format-specific render
  return { blob, filename: `${safeBaseName(model)}.${ext}`, mimeType };
}
```

- The model is built **once** per export; the renderer never sees the raw result.
- `exportReport()` wraps `generateExport()` and performs the anchor-click download,
  then revokes the object URL. It is a safe no-op when `document` is undefined
  (SSR / tests), so the same code path is unit-testable off-DOM.

## Renderer registry (`renderers/index.ts`)

Each format is one entry: `{ descriptor, render(model) => Promise<Blob> }`.

- Text formats (md, html, txt, rtf) are wrapped by `textRenderer()`, which turns a
  `(model) => string` into a `text/*` Blob with UTF-8 charset.
- Binary formats (pdf, docx) return a Blob directly.

`FORMAT_ORDER = ['pdf','docx','md','html','txt','rtf']` controls presentation.

## File size estimation

Rendering all six formats on modal open would be wasteful, so
`estimateFileSize()` computes the canonical model's total text weight once and
applies a per-format `(multiplier, fixed-overhead)`:

| Format | multiplier | overhead |
|--------|-----------|----------|
| txt  | 1.05 | 400 B |
| md   | 1.15 | 500 B |
| rtf  | 1.70 | 900 B |
| html | 2.40 | 4.2 KB |
| pdf  | 0.70 | 15 KB |
| docx | 1.30 | 9 KB |

Figures are labelled "~" in the modal (honest estimate); the real bytes are
produced when the chosen format renders.

## Filenames

`safeBaseName()` yields `Narratix_Report_<Niche>_<Platform>` with separators and
filesystem-unsafe characters stripped, then appends the format extension —
e.g. `Narratix_Report_Personal_Finance_TikTok.pdf`.

## Libraries

- **jsPDF** `^4.2.1` (PDF) and **docx** `^9.7.1` (Word) — already project
  dependencies; no new packages were added.
- Markdown / HTML / Text / RTF are pure string generation — zero dependencies.
