# Stage 8A — Regression Report

All commands run from `Narratix Lab/narratix-app`.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** (exit 0) |
| `next lint` | **✔ No ESLint warnings or errors** (exit 0) |
| `npm run test:demo` | **43 passed, 0 failed** (exit 0) |
| `npm run test:ai` | **22 passed, 0 failed** (exit 0) |

## Interpretation
- TypeScript: clean. The renderer's `as unknown as {...}` narrowing keeps type
  safety intact against the stale `suggested_rewrite: string` declaration without
  altering the data model.
- Lint: clean.
- Demo Mode suite (43): profile selection, honest personalization, provenance,
  variation determinism, transparency — all still green. Demo Mode untouched.
- AI pipeline suite (22): engine/provider behavior, no-silent-fallback, secret
  hygiene — all still green. AI engine untouched.

## Project-wide object-in-JSX scan (Step 5)
- Only active-app site rendering a rewrite object was
  `AnalysisResults.tsx:1464-1480` — now fixed.
- No other `.tsx` in `components/` or `app/` renders `suggested_rewrite*` or any
  hook/rewrite object directly.
- Other rendered `results.*` fields (core_topic, key_promise, why_fail,
  audience_perception, scores, etc.) are scalar strings/numbers per schema —
  verified not object-typed.
- Out-of-tree copies NOT imported by the app (excluded, no change made):
  `Narratix Lab/Adv Features Code/export/pdf/AnalysisResults.print-pdf.tsx`,
  `Narratix Lab/archive/duplicate-next/.../AnalysisResults.tsx`.

## Regression status: ✅ ZERO REGRESSIONS
1 file changed, 1 render block, no data-model / engine / demo / prompt / report
changes.
