# Stage 8B — Export System Architecture

## Objective

Let users export any completed analysis report in six professional formats — PDF,
Word (.docx), Markdown, HTML, Plain Text, and Rich Text — from a **single**
export pipeline built on **one canonical report model**, with an architecture
that admits ODT and EPUB later without any rewrite.

## Design principle: one model, many renderers

```
AnalysisResult ──▶ buildReportModel() ──▶ ReportModel ──▶ [ renderer ] ──▶ Blob
   (raw data)        (the ONLY place            (canonical,        (one per
                      report content is          format-agnostic    format)
                      decided)                   document tree)
```

- **One source model.** `buildReportModel()` (lib/export/report-model.ts) maps a
  raw `AnalysisResult` + UI context into a `ReportModel` — a generic document
  tree of sections and blocks (paragraph, key-value, score-table, list,
  callout). This is the single place that decides **what** appears in a report.
- **Renderers decide only "how".** Each format renderer walks the same
  `ReportModel` and knows nothing about hooks, retention, or demo mode — it only
  knows how a generic block looks in its format. No renderer re-reads the raw
  `AnalysisResult`.
- **No duplicate rendering logic.** The pre-existing `lib/exporters.ts` (which
  re-implemented PDF/DOCX/MD independently) has been removed; all formats now go
  through this one pipeline.

## Module layout

```
lib/export/
├── types.ts             Canonical model + block union + format descriptors
├── report-model.ts      buildReportModel(): AnalysisResult → ReportModel (single source)
├── export-service.ts    ExportService: formats, size estimate, generate, download
├── index.ts             Public surface (@/lib/export)
└── renderers/
    ├── index.ts         Format registry: id → { descriptor, render(model) }
    ├── markdown.ts       ReportModel → Markdown
    ├── text.ts           ReportModel → Plain Text
    ├── html.ts           ReportModel → self-contained HTML
    ├── rtf.ts            ReportModel → RTF 1.x
    ├── pdf.ts            ReportModel → PDF (jsPDF)
    └── docx.ts           ReportModel → DOCX (docx)

components/dashboard/ExportModal.tsx   Professional modal (calls the service only)
scripts/export-tests.ts                Offline test suite (67 assertions)
```

## The canonical block model

A `ReportModel` is `{ brand, title, generatedDate, headerFields, overall,
sections[], transparency, demoBadge }`. Each section holds ordered blocks:

| Block        | Purpose                                             |
|--------------|-----------------------------------------------------|
| `paragraph`  | Labelled or plain prose (Diagnosis, Verdict, …)     |
| `keyValue`   | Benchmarks, metadata, provenance pairs              |
| `scoreTable` | Module scores                                       |
| `list`       | Recommendations, action plan (ordered/unordered)    |
| `callout`    | Framed transparency notice                          |

A renderer implements a five-arm visitor over this union — that is the entire
contract. Adding a format never touches the model or the builder.

## Extensibility (ODT / EPUB later)

To add a format:
1. Write `renderers/odt.ts` exporting `renderOdt(model: ReportModel)`.
2. Register one entry in `renderers/index.ts` with its descriptor.
3. Add its id to `FORMAT_ORDER`.

The model, builder, `ExportService`, and `ExportModal` require **zero** changes —
the modal enumerates `getSupportedFormats()` dynamically, so the new format
appears automatically. This is verified by the registry-driven test suite.

## Boundaries respected

- AI engine (`lib/ai/*`) — untouched.
- Demo Mode (`lib/ai/demo*.ts`) — untouched; the export system only *reads* the
  demo provenance already attached to results.
- Report generation & the `AnalysisResult` model — untouched.
- No redesign of the application; the only UI change is swapping the export
  dropdown for the export modal.
