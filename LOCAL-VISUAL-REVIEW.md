# Narratix Lab — Phase 0.5B Local Visual Review

**Status:** READY FOR OWNER VISUAL REVIEW
**Deployment:** NOT DEPLOYED · **Beta V2:** NOT STARTED · **Live Supabase:** NOT CONTACTED

---

## LOCAL VISUAL REVIEW AUTH

### Starting the environment

One command, from `Narratix Lab Code /narratix-app`:

```
npm run review
```

Then open **http://localhost:3000/ui-review**.

That starts three processes, all bound to `127.0.0.1` — nothing is exposed publicly and no
tunnel is used:

| Port | Process | File |
|---|---|---|
| 54999 | local auth/data stand-in | `local-review/mock-supabase.js` |
| 3001 | the real, unmodified Next.js dev server | — |
| 3000 | front door proxy | `local-review/review-server.js` |

`Ctrl-C` stops all three.

### Establishing the review session

Open `/login` and sign in with:

```
demo@narratixlab.test
demo
```

Any email and password works — the stand-in accepts every credential. The **Continue with
Google** button also resolves to the same local session; it never leaves this machine and
never contacts Google or the live Supabase project.

The session is a normal Supabase cookie (`sb-localhost-auth-token`) written by the
application's own unmodified client. It survives client-side navigation and a full page
reload on `/dashboard`, `/settings` and `/billing`.

### Routes reviewable under the session

`/dashboard` · `/analyze` · `/history` · `/billing` · `/settings` ·
`/settings?tab=notifications` · `/settings?tab=mcp` · `/reports/<id>` · `/report/<id>` (redirects to `/reports/<id>`)

The stand-in serves one demo report so the report surfaces render real content:

```
9c4f1e28-3d57-4a6b-8e10-52b7cf0a91d3
http://localhost:3000/reports/9c4f1e28-3d57-4a6b-8e10-52b7cf0a91d3
```

Its `results` payload is the application's own curated demo profile
(`lib/ai/demo-profiles/tutorial.json` — the existing `DEMO_MODE` data). No production data is
read or written, and no fake production report was created.

### Google OAuth — intentionally excluded

Real Google OAuth against the production project is **not** part of this review and was not
configured, changed or tested. The button stays visually present and runs the same unmodified
`signInWithOAuth` code path it always has; locally that path terminates at the stand-in's
`/auth/v1/authorize`, which redirects straight back to the application's own
`/api/auth/callback` with a code the stand-in then exchanges. Production OAuth behaviour is
untouched.

### Why this is local-only

The **only** difference from a normal `npm run dev` is the value of `NEXT_PUBLIC_SUPABASE_URL`,
which `local-review/start.js` points at the local front door instead of the live project. The
application code is byte-identical and performs its normal, unmodified authentication.

- No bypass flag, no dev branch in `middleware.ts`, no weakened check, no fake user in any
  production code path.
- `middleware.ts`, `lib/supabase-*.ts`, `lib/security.ts`, `app/api/auth/callback/route.ts` and
  `.env.local` were **not modified**.
- Nothing in `app/` imports or references `local-review/`; `next build` never compiles it, so
  it cannot exist in a deployed bundle.
- `local-review/start.js` refuses to run when `NODE_ENV=production`.
- `/ui-review` returns **404** under `NODE_ENV=production` — verified against a real production
  build.
- The application's CSP allows `connect-src 'self'` only. The proxy exists so the stand-in is
  same-origin; that is why a proxy is used rather than an auth bypass.

### Known limitations

- The stand-in is **read-only**. Writes (delete a report, save a profile change, run an
  analysis that persists) are acknowledged but discarded, and vanish on reload.
- Only `profiles` and `analyses` are backed by data; every other table returns an empty list.
- The dashboard and history show the single demo report; counts and charts reflect that.
- The stand-in accepts any credential, so error states on `/login` cannot be exercised through
  a wrong password — submit an empty form to see the validation error instead.

---

## Routes

| Route | Component under review |
|---|---|
| `/login` | **1 — Login card** |
| `/signup` | Same card material |
| `/pricing` | **2 — Pricing table** |
| `/dashboard` | **3 — Dashboard sidebar** |
| `/analyze` | App shell rail |
| `/history` | App shell rail |
| `/billing` | App shell rail |
| `/settings?tab=notifications` | **4 — Tactile toggle** |
| `/ui-review` | Launcher (development-only; 404s in production) |

---

## Automated verification — actual results

All run in a real Chromium browser against `http://localhost:3000` with **CSP enforced** (no bypass).
**46 / 46 assertions passed.** The local-auth repair was re-verified separately: **21 / 21** on login,
protected routes, report surfaces, sidebar navigation, the notifications toggle and reload persistence,
plus the Google button resolving to a local session.

| Gate | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | **PASS** — clean |
| Lint (`next lint`) | **PASS** — no warnings or errors |
| Production build (`next build`) | **PASS** — 22 routes compiled |
| `/ui-review` unreachable in production build | **PASS** — returns 404 under `NODE_ENV=production` |
| Live interaction checks | **PASS** — 46 / 46 |
| Horizontal overflow, 9 routes × 5 widths | **PASS** — 45 / 45 combinations clean |
| Controls clipped outside viewport | **PASS** — none |
| CSP violations in a real browser | **PASS** — none |

---

## Login

Desktop
- [x] 1440 — renders, card material correct
- [x] 1024 — no overflow

Mobile
- [x] 390 — no overflow, card fits
- [x] 768 — no overflow

States
- [x] Default
- [x] Focus — visible ring measured on `#login-email`
- [x] Error — empty submit produces `#login-error` with `role="alert"`; `aria-invalid="true"` propagated to inputs
- [x] Password visibility — `password → text`, `aria-pressed="true"`; SHOW/HIDE control measured 44×34px
- [x] Loading — "Signing in…" with the button disabled
- [x] Labels — `#login-email` / `#login-password` programmatically associated (they were not before)
- [x] Sign-in — real form submits and redirects to `/dashboard`

---

## Pricing

Widths
- [x] 1440 — three cards, lead plan lifted `translateY(-14px)` on hover
- [x] 1024
- [x] 768
- [x] 390 — single column, lift disabled

States
- [x] Default
- [x] Hover — elevation change measured
- [x] Plan emphasis — accent border and "Available now" badge on Free, the only purchasable plan
- [x] CTA — focus ring 3px; primary CTA href is `/analyze`

Unchanged, verified programmatically
- [x] Prices — `$0` / `$10` / `$15`
- [x] Plan names — Free / Pro / Team
- [x] Pro and Team remain `disabled`
- [x] Exactly one primary CTA in the plan grid
- [x] No Stripe, checkout or plan-identifier code touched

---

## Dashboard sidebar

Widths
- [x] 1920 — rail on
- [x] 1440 — rail on, width measured 236px
- [x] 1024 — rail on
- [x] 768 — rail off, original top bar behaviour
- [x] 390 — rail off, hamburger drawer

States
- [x] Expanded — 236px
- [x] Active — `aria-current="page"`, accent capsule + left marker
- [x] Hover — background change measured `rgba(0,0,0,0) → rgb(26,26,29)`
- [x] Collapsed — 76px, 7 items keep accessible names, persists across reload
- [x] Mobile — drawer opens; items still `Dashboard, Analyze, Reports, Billing`
- [x] Keyboard — focus ring 3px; Enter activates

Navigation, all verified live
- [x] Dashboard → `/dashboard`
- [x] Analyze → `/analyze`
- [x] Reports → `/history`
- [x] Billing → `/billing`
- [x] No duplicate nav — top-bar links `display: none` at ≥1024 on app routes only

Breakpoint contract (measured)

| Width | Rail | Top-bar links | Hamburger |
|---|---|---|---|
| 390 | off | off | **on** |
| 768 | off | off | **on** |
| 1024 | **on** | off | off |
| 1440 | **on** | off | off |
| 1920 | **on** | off | off |

---

## Settings toggle

Widths
- [x] 1440
- [x] 390
- [x] 768 / 1024 / 1920 also captured

States
- [x] OFF
- [x] ON — fill `rgb(124,58,237)` vs off `rgb(26,26,29)`, so state is a **contrast** difference, not a shadow direction
- [x] Focus — 3px ring on the track
- [x] Keyboard — Space flips `aria-checked`
- [x] Pressed — track compresses to 96%, thumb stretches 16→20px, 120ms
- [x] Reduced motion — press physics and transitions collapse
- [x] Accessible names — all three switches (`Analysis Complete`, `Weekly Summary`, `Marketing Emails`); they had **none** before
- [x] Hit area — measured 48×44px

---

## Known issues — documented, NOT fixed

All four sit outside the four-component scope. None were introduced by this pass.

1. **`--nl-*` tokens are never defined.** `UploadPanel.tsx:35,116` uses `bg-nl-panel`, `border-nl-border`,
   `shadow-nl-card`, `from-nl-primary`, `to-nl-primaryDark`, `shadow-nl-glow`. `tailwind.config.js` maps
   them to `var(--nl-*)`, which is defined nowhere. The panel renders with no background, border, shadow
   or button gradient. *Category C — existing production issue.*

2. **Settings Profile inputs unlabelled.** "Full Name" and "Display Name" have no `id`/`htmlFor` pairing.
   Component 4 covered the Notifications toggle only. *Category E — accessibility.*

3. **Hard-coded `#fff` breaks light theme.** `AccountPages.tsx`, `DashboardContent.tsx`, `Footer.tsx`.
   In light theme the footer pre-footer is effectively invisible. Fixed on `/pricing` only, where
   Component 2 already rewrote the surface. *Category C.*

4. **Saved theme preference is stripped on load — found during this review.** `app/layout.tsx` injects a
   boot script that sets `data-theme` on `<html>`; React removes it during hydration ("Extra attributes
   from the server: data-theme"), so `data-theme` is `null` on every page and the app falls back to the
   OS colour scheme. The Settings page still applies a theme at runtime, but the choice does not survive
   a reload. `app/layout.tsx` was **not** modified by this pass. *Category C — existing production issue.*
   **To review dark or light, switch your OS appearance and reload.**

---

## Files changed by this pass

**Modified (11):** `app/globals.css`, `app/(main)/pricing/page.tsx`, `components/auth/LoginForm.tsx`,
`components/auth/SignupForm.tsx`, `components/settings/SettingsPage.tsx`, `components/layout/Navbar.tsx`,
and the five authed route files.

**Created (7):** `components/layout/AppShell.tsx`, `components/layout/SidebarNav.tsx`,
`components/layout/NavIcons.tsx`, `app/ui-review/page.tsx`, `app/ui-review/UiReviewLauncher.tsx`,
`UI-COMPONENT-INTEGRATION-PLAN.md`, `LOCAL-VISUAL-REVIEW.md`, plus `public/ui-review/*.jpg` reference thumbnails.

**Preserved:** the pre-existing uncommitted `next.config.mjs` change (the `appOrigin` default) is untouched.

---

## Owner decision

Nothing has been deployed, pushed or merged. The decision controls on `/ui-review` are informational
only — they record notes in your browser and cannot deploy anything.

Actual approval is given by you in the conversation.
