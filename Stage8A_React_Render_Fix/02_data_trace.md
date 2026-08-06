# Stage 8A — Data Trace

Traced backwards from the JSX crash to the origin of the object. No guessing —
each hop was read directly.

```
Curated demo profile JSON
  lib/ai/demo-profiles/marketing.json
  hook_analysis.suggested_rewrite_1 = { archetype, text, why_better }   ← object at source
        │
        ▼
buildDemoAnalysis()  lib/ai/demo.ts:117
  - deep-clones the chosen profile (line 126)
  - aligns only neutral factual fields (niche/platform/goal, word counts, detected_hook)
  - does NOT touch hook_analysis.suggested_rewrite_* → object preserved
        │
        ▼
normalizeNaxResult(report)  lib/ai-engine-client.ts:188 / 275,438-452
  - hook_analysis already present, so the string-producing DEFAULTS never run:
      line 446: suggested_rewrite_1 = hook_analysis.suggested_rewrite_1 ?? 'Start with...'
      (?? keeps the existing OBJECT)
  - the string fallbacks at 649/671/687 sit inside `raw.document_intelligence ?? {}`
    / `raw.rewrite_engine ?? {}` blocks; demo profiles already have those sections,
    so those blocks are skipped entirely
        │
        ▼
results.hook_analysis.suggested_rewrite_1  (still { archetype, text, why_better })
        │
        ▼
AnalysisResults render  components/dashboard/AnalysisResults.tsx:1464-1480
  { text: results.hook_analysis.suggested_rewrite_1 }   ← object assigned to `text`
  {rewrite.text}                                        ← object → React child → CRASH
```

## Exact field
`hook_analysis.suggested_rewrite_1`, `suggested_rewrite_2`, `suggested_rewrite_3`
— each an object `{ archetype: string, text: string, why_better: string }`.

## Runtime reproduction (real pipeline, DEMO_MODE=true)
Running `buildDemoAnalysis(DEMO_SAMPLE_SCRIPT)` and inspecting the normalized
result produced exactly the crashing object:
```
RAW suggested_rewrite_1 typeof: object
RAW value: {"archetype":"Curiosity Gap","text":"Are you tired of spending hours on
video editing? There's a tool that will change that.","why_better":"This rewrite
directly engages the viewer's pain point and sets up curiosity."}
```

## Note on the stale type
`lib/ai-engine-client.ts:51-55` still declares `suggested_rewrite_1: string`. This
type is out of date relative to the actual schema/data, but it was **not** changed:
the ticket forbids modifying the AI engine and flattening the data model. The
renderer handles the object shape defensively instead (see 03_fix_summary.md).
