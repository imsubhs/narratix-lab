# Stage 8A — Root Cause

## Error
```
Objects are not valid as a React child (found: object with keys {archetype, text, why_better}).
If you meant to render a collection of children, use an array instead.
```
Thrown during `/analyze` render after running a demo analysis (Next.js 14.2.35, dev/turbo).

## First location where a plain object is passed into JSX

| | |
|---|---|
| **Component** | `AnalysisResults` |
| **File** | `components/dashboard/AnalysisResults.tsx` |
| **Line (pre-fix)** | `1480` |
| **Property** | `hook_analysis.suggested_rewrite_1` / `_2` / `_3` (rendered via the local `rewrite.text`) |

Pre-fix JSX:
```tsx
{[
  { label: 'Rewrite 1', text: results.hook_analysis.suggested_rewrite_1, swipe: ... },
  { label: 'Rewrite 2', text: results.hook_analysis.suggested_rewrite_2, swipe: ... },
  { label: 'Rewrite 3', text: results.hook_analysis.suggested_rewrite_3, swipe: ... }
].filter(r => r.text).map((rewrite, i) => (
  ...
  <p ...>{"\""}{rewrite.text}{"\""}</p>   // ← rewrite.text is an OBJECT, not a string
))}
```

## Why it crashes
The "3 Hook Rewrite Comparison Cards" block was written against an **older data
model** in which `suggested_rewrite_1/2/3` were plain strings. The current schema
makes each rewrite an **object** `{ archetype, text, why_better }`
(`lib/ai/prompts.ts:150-164`, enforced by `lib/ai/validate.ts:252-261`, and stored
that way in every curated demo profile, e.g.
`lib/ai/demo-profiles/marketing.json`).

So `rewrite.text` held the whole object. `.filter(r => r.text)` kept it (an object
is truthy), and `{rewrite.text}` handed the object straight to React, which cannot
render a plain object as a child → `throwOnInvalidObjectType`.

## Classification
**Renderer bug, not a data-model bug.** The object shape is the intended,
validator-enforced schema. Only this one render site was still reading it as a
string. Fix is confined to the renderer; the data model was not flattened.
