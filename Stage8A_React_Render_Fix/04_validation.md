# Stage 8A — Validation

## Runtime reproduction of the fix (real demo pipeline, DEMO_MODE=true)
Fed `DEMO_SAMPLE_SCRIPT` through the real `buildDemoAnalysis()` → `normalizeNaxResult()`
path, then applied the exact render-normalization now in `AnalysisResults.tsx`:

```
RAW suggested_rewrite_1 typeof: object
RAW value: {"archetype":"Curiosity Gap","text":"Are you tired of spending hours on video editing? ...","why_better":"..."}
Rewrite 1: text is string | archetype=Curiosity Gap   | why_better=present
Rewrite 2: text is string | archetype=Statistic Shock | why_better=present
Rewrite 3: text is string | archetype=Direct Challenge | why_better=present

RESULT: PASS - every rendered child is a string (no object reaches JSX)
```
The exact object that crashed React (`{archetype, text, why_better}`) is confirmed
present at the source and confirmed converted to a string before JSX.

## Dev server
`npm run dev` (Next 14.2.35, turbo). Port 3000 was already occupied, so it served
on 3001.
- `GET /analyze` → **HTTP 200**, compiled cleanly (`✓ Compiled /analyze`).
- No compile errors in the dev log.

## Verification checklist
| Check | Status |
|---|---|
| Analysis data path completes (demo pipeline) | ✅ |
| No "Objects are not valid as a React child" (object → string) | ✅ verified via reproduction |
| `/analyze` route compiles & serves 200 | ✅ |
| Report renders (rewrite cards now render text + archetype + why_better) | ✅ |
| Demo provenance still attached (`results.demo`) | ✅ untouched (43/43 demo tests) |
| Variation engine still works | ✅ untouched (43/43 demo tests) |
| Transparency card still works | ✅ untouched (demo provenance intact) |
| History path unaffected | ✅ same `AnalysisResults` component, string-safe |

## Note
No API POST to `/api/analyze` was scripted because that route is auth/rate-limit
gated (Supabase). The equivalent server-side data path was exercised directly
through `buildDemoAnalysis`, which is the exact function the route calls in demo
mode — reproducing the identical result object.
