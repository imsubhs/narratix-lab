# Narratix Lab — Phase 0.5B Local Responsive Review

**Status:** READY FOR OWNER VISUAL REVIEW · **NOT DEPLOYED** · **Beta V2 NOT STARTED**

All results below are actual measurements taken against the real application running on
`http://localhost:3000`. Nothing is estimated.

Method: 12 viewports × 8 routes × 3 engines (Chromium, WebKit, Firefox) = **288 route renders per
engine pass**. Touch classes were emulated with `hasTouch: true` so `pointer: coarse` genuinely
matches. Every finding was diffed against the **current production code at `HEAD`** running
simultaneously on a second port, so pre-existing issues are separated from anything this pass
introduced.

---

## Device matrix

| Device | Width | Height | Status | Notes |
|--------|-------|--------|--------|-------|
| PC | 2560 | 1440 | **PASS** | Rail 236px. Content capped at 1120px by the existing `.wrap` — does not stretch. |
| PC | 1920 | 1080 | **PASS** | Rail 236px, content 1120px. |
| PC | 1440 | 900 | **PASS** | Rail 236px, content 1108px. |
| Laptop | 1366 | 768 | **PASS** | Rail 236px, content 1034px. Comfortable, not compressed. |
| Laptop | 1280 | 800 | **PASS** | Rail 236px, content 948px. |
| Tablet | 1024 | 1366 | **PASS** | Portrait. Rail retained (788px usable beside it); rows relax to 44px on touch. Dashboard metrics reflow to stacked. |
| Tablet | 1366 | 1024 | **PASS** | Landscape. Rail 236px, content 1034px. |
| Tablet | 768 | 1024 | **PASS** | Portrait. Rail **off**, existing hamburger drawer takes over. Settings nav stacks above content. |
| Phone | 390 | 844 | **PASS** | Rail off, drawer. Pricing single column, login card fits. |
| Phone | 375 | 812 | **PASS** | Rail off, drawer. |
| Phone | 360 | 800 | **PASS** | Rail off, drawer. Narrowest tested; no overflow, toggle + ON/OFF label still fit. |
| Phone | 844 | 390 | **PASS** | Landscape. Rail off, top-bar links return. Usable. |

## Routes tested at every viewport

`/login` · `/signup` · `/pricing` · `/dashboard` · `/analyze` · `/history` · `/billing` ·
`/settings?tab=notifications`

---

## Results by category — all three engines identical

| Check | Chromium | WebKit | Firefox |
|---|---|---|---|
| Horizontal page overflow | **0** | **0** | **0** |
| Controls clipped outside viewport | **0** | **0** | **0** |
| Card / grid overlap | **0** | **0** | **0** |
| Wide region forcing page scroll | **0** | **0** | **0** |
| **Findings on a Phase 0.5B component** | **0** | **0** | **0** |
| Pre-existing small tap targets | 56 | 56 | 56 |
| Pre-existing sub-11px text | 96 | 96 | 96 |

The baseline (`HEAD`) run under identical conditions produced **56 small-tap and 96 tiny-text
findings** — an exact match — plus **one horizontal overflow that this pass does not have**.

---

## Shell behaviour by width (measured)

| Width | Rail | Top-bar links | Hamburger | Content column |
|---|---|---|---|---|
| 360–768 | off | off | **on** | full width |
| 769–999 | off | **on** | off | full width |
| 1000+ | **on** (236px) | off | off | offset 236px |

There is **no width at which navigation is unavailable, and none at which it is duplicated** —
verified explicitly at 768, 990, 1000, 1024 and 1100 in all three engines.

---

## Two issues found and fixed — both caused by this pass

### 1. Rail rows below the touch-target guideline on tablets
`.shell-rail-item` measured **40px** tall. The rail shows from 1024px up, which includes touch
tablets, where 40px falls under the ~44px guideline.

**Fix:** the rail relaxes its density on coarse pointers only —
`@media (min-width: 1000px) and (pointer: coarse)` raises rows to 44px and the account block to
48px. Mouse-driven desktops keep the tighter rhythm you have been reviewing.
**Verified:** 44px on touch, 40px on fine pointer.

### 2. Shell breakpoint disagreed between engines at exactly 1024px
Media queries resolve against the layout viewport, which **excludes a classic scrollbar**. Desktop
WebKit reports `clientWidth: 1018` for a 1024px-wide window, so `min-width: 1024px` did not match
and Safari fell back to the top-bar layout at exactly iPad-portrait width. Navigation still worked,
but the two engines disagreed at a common device size.

**Fix:** the shell breakpoint moved from 1024px to **1000px**, absorbing the scrollbar reservation
while still leaving 764px of content beside the 236px rail. All four related rules moved together so
the rail and the top-bar links can never both appear.
**Verified:** all three engines now agree at 1024px.

---

## Known issues — pre-existing, NOT introduced or fixed by this pass

Each was confirmed present in the baseline `HEAD` build under identical measurement.

| # | Issue | Evidence | Category |
|---|---|---|---|
| 1 | **`--nl-*` tokens never defined.** `UploadPanel.tsx` renders with no background, border, shadow or button gradient. | `tailwind.config.js` maps to `var(--nl-*)`, defined nowhere | C — existing production |
| 2 | **Settings Profile inputs unlabelled.** "Full Name" / "Display Name" have no `id`/`htmlFor`. | measured directly | E — accessibility |
| 3 | **Hard-coded `#fff` breaks light theme.** Footer pre-footer effectively invisible. | `AccountPages`, `DashboardContent`, `Footer` | C |
| 4 | **Saved theme preference stripped on load.** Boot script sets `data-theme`; React removes it on hydration, so the app follows the OS scheme. | `data-theme` is `null` on every route | C |
| 5 | **Small tap targets (56).** `.logo` 28px, `.nl` 22–30px, `.mobile-menu-btn` 36×32, `.stg-nav-item` 39px, `.btn` 41–43px, `.finput` 42–43px. | **identical count in baseline** | C |
| 6 | **Sub-11px text (96).** All instances are the 10px `🧪 Beta` badge and 10px "Coming Soon" / "Upcoming Capabilities" pill labels. | **identical count in baseline** | C |

Items 5 and 6 are the only remaining responsive-category findings. None touch a Phase 0.5B
component, all are unchanged from production, and per the brief they are documented rather than
silently fixed.

---

## Verification gates (re-run after the responsive fixes)

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Lint | **PASS** |
| Production build | **PASS** — compiled successfully |
| `/ui-review` unreachable in production | **PASS** — 404 under `NODE_ENV=production` |
| Live interaction suite | **46 / 46 PASS** |
| CSP violations in a real browser | **none** |

---

## Evidence

48 device-class screenshots (12 viewports × `/login`, `/pricing`, `/dashboard`, `/settings`) plus the
full before/after archive at `Narratix Lab/Phase-0.5B-Visual-Demo/index.html`.

## Deployment

**NOT DEPLOYED.** No push, no merge, no Vercel deployment. Live Supabase not contacted. Beta V2 not
started.
