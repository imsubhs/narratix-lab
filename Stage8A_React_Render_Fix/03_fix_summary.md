# Stage 8A — Fix Summary

## Scope
Single file, single render block. No data-model change, no engine change, no demo
change, no prompt change, no report-generation change, no redesign.

## File changed
`components/dashboard/AnalysisResults.tsx` — the "3 Hook Rewrite Comparison Cards"
block (previously lines 1463-1483).

## What changed
Normalize each rewrite at the render site to primitive fields before JSX, so an
object never reaches a React child. Handles **both** the current object schema
`{ archetype, text, why_better }` and the legacy/fallback plain-string shape.

```tsx
{[
  { label: 'Rewrite 1', value: results.hook_analysis.suggested_rewrite_1, swipe: ... },
  { label: 'Rewrite 2', value: results.hook_analysis.suggested_rewrite_2, swipe: ... },
  { label: 'Rewrite 3', value: results.hook_analysis.suggested_rewrite_3, swipe: ... }
].map(r => {
  // A rewrite may be an object { archetype, text, why_better } (current schema)
  // or a plain string (legacy / fallback). Normalize to primitive fields so JSX
  // never receives the object itself.
  const raw = r.value as unknown;
  const rw = (raw && typeof raw === 'object')
    ? raw as { archetype?: string; text?: string; why_better?: string }
    : { text: raw as string | undefined };
  return { label: r.label, swipe: r.swipe, text: rw.text, archetype: rw.archetype, why_better: rw.why_better };
}).filter(r => r.text).map((rewrite, i) => {
  ...
  <span ...>{rewrite.label}{rewrite.archetype ? ` · ${rewrite.archetype}` : ''}</span>
  ...
  <p ...>{"\""}{rewrite.text}{"\""}</p>                      // now always a string
  {rewrite.why_better && (
    <p ...>{rewrite.why_better}</p>                          // surfaced when present
  )}
})}
```

## Behaviour
- `rewrite.text` rendered in JSX is now guaranteed to be a string (or the card is
  filtered out).
- The schema's `archetype` is shown as a subtle suffix on the existing label, and
  `why_better` as a small helper line under the rewrite — the "correct fields" the
  ticket called for, using the card's existing style vocabulary (no redesign).
- Backward compatible: if a rewrite ever arrives as a plain string (the fallback
  path in `ai-engine-client.ts`), it still renders correctly.

## Why fix the renderer, not the data
The object shape is the intentional, validator-enforced schema
(`prompts.ts` + `validate.ts`) and is what every curated demo profile stores.
Flattening it globally would violate the ticket and break validation. Only this
one render site was stale, so the fix is local to it.
