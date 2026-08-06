# Stage 8B — Validation

All checks were run from `narratix-app/`. Everything passed with zero failures.

## Commands & results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | **Pass** — 0 errors |
| Lint | `npm run lint` | **Pass** — no ESLint warnings or errors |
| Export tests | `npm run test:export` | **67 passed, 0 failed** |
| Demo tests | `npm run test:demo` | **43 passed, 0 failed** |
| AI tests | `npm run test:ai` | **22 passed, 0 failed** |

## Export test coverage (`scripts/export-tests.ts`)

Offline, no network. 67 assertions across:

- **Format registry** — exactly the six required formats; every format has a
  description and a recommended use.
- **Canonical model** — built once; contains brand, header fields, and the
  Executive Summary / Module Scores / Recommendations / Action Plan sections.
- **Rendering** — all six formats produce a non-empty Blob with the correct file
  extension.
- **Content** — each text format contains the brand, overall score, a module
  name, and (for live reports) the provider and model.
- **Privacy (DO NOT EXPORT)** — 15 forbidden telemetry/secret tokens are absent
  from every text export; the PDF byte stream is scanned for the secret request
  id. See `04_demo_transparency.md`.
- **Live transparency** — footer names the Narratix Intelligence Engine and
  carries Provider / Model / Prompt Version / Analysis Version.
- **Demo transparency** — demo flag + badge set; the exact mandated disclaimer
  is present in the exported Markdown; no live provider string leaks.
- **Size estimation** — every format returns a human-readable estimate.

## "Downloads successfully and opens correctly"

- **Blob + filename correctness** is asserted programmatically for all six
  formats (size > 100 bytes, correct extension).
- **PDF** is generated via jsPDF `output('blob')` and its byte stream is
  inspected — valid `%PDF` document.
- **DOCX** is produced via `docx` `Packer.toBlob` (a valid OOXML zip package).
- **HTML** is a self-contained, standards-valid document (opens directly in any
  browser; no external requests, so it renders offline).
- **MD / TXT / RTF** are UTF-8 text blobs; RTF is a valid RTF 1.x document that
  opens in Word / Pages / WordPad / TextEdit.
- The browser download path (`exportReport`) uses the standard object-URL +
  anchor-click pattern and revokes the URL after the click.

## Regression status

The AI engine, Demo Mode, and report generation were not modified. Demo (43/43)
and AI pipeline (22/22) suites confirm no regression. The only behavioural change
is the export UI (dropdown → modal) and the removal of the now-duplicate
`lib/exporters.ts`, whose sole consumer was migrated to the new service.
