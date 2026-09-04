# UI Component Integration Plan — Phase 0.5B

**Scope:** four owner-selected components only. No global redesign.
**Strategy:** existing Narratix design preserved; four components adapted *to* Narratix.
**Baseline at start:** `tsc --noEmit` clean, `next lint` clean.

---

## Ground rules applied to all four

| Rule | Consequence |
|---|---|
| Narratix purple `--accent: #7c3aed` stays the only brand accent | No Signal Amber, no oklch brand hues, no rainbow conic gradients |
| Existing token system is the vocabulary | Every new value resolves to an existing `--space-*`, `--radius-*`, `--duration-*`, `--shadow-*`, `--ease-*` token |
| Three themes must keep working | dark (default), `[data-theme="light"]`, `[data-theme="high-contrast"]` — glass is defined per-theme, and disabled entirely in high-contrast |
| State is never carried by a visual effect alone | Every state also has a text, contrast, or structural signal |
| No perpetual motion | Every infinite animation in the four experiments is dropped |
| `prefers-reduced-motion` respected | Already globally enforced in `globals.css:246`; new transitions inherit it, plus explicit per-component fallbacks |

---

## Component #1 — Login Card

| Field | Detail |
|---|---|
| **Source experiment** | `Comps of UI/liquid-glass-login-card.html` (`.lg-17`) |
| **Current production component** | `components/auth/LoginForm.tsx` + `.auth-card` (`globals.css:739`) |
| **Target route** | `/login` (and `/signup` for consistency — same `.auth-card` surface) |
| **Reusable behavior** | Centred self-contained card as the whole viewport's subject; `:focus-within` field elevation; generous internal padding |
| **Retain from Narratix** | Supabase `signInWithPassword`, Google OAuth flow, `redirect` param sanitising, `FEATURES.GOOGLE_AUTH` gate, tab bar (Sign In / Create Account), SHOW/HIDE password control, error surface, all copy |
| **Adapt from experiment** | Glass material → Narratix tokens (`--glass-bg`, `--glass-border`, `--glass-highlight`), blur reduced 22px → 18px; accent focus ring → `--accent` at existing 3px `--accent-light` spread; ambient backdrop → static, purple-only, replacing the currently **undefined** `.grid-bg` class |
| **Reject from experiment** | `lg-17-drift` 20s infinite background animation; the four-hue rainbow mesh; the sweeping specular `::after` shimmer on the submit button; "Remember me" (not in Narratix auth); `oklch` accent |
| **Files likely to change** | `components/auth/LoginForm.tsx`, `components/auth/SignupForm.tsx`, `app/globals.css` (AUTH section) |
| **Risk** | **Low.** Presentation only; no auth logic touched. Main risk is `backdrop-filter` cost on low-end mobile → mitigated by a solid-colour fallback via `@supports not (backdrop-filter: blur(1px))` |
| **Accessibility requirements** | Fix existing defect: `.flbl` labels have no `htmlFor` and inputs have no `id` — labels are currently unassociated. Add `id`/`htmlFor`, `aria-invalid` + `aria-describedby` on error, `role="alert"` on the error region, `aria-pressed` on SHOW/HIDE, visible focus on the glass surface, ≥44px touch targets |

---

## Component #2 — Pricing Table

| Field | Detail |
|---|---|
| **Source experiment** | `Comps of UI/liquid-glass-pricing-table.html` (`.lg-10`) |
| **Current production component** | `app/(main)/pricing/page.tsx` + `.pc` / `.pc-free` / `.pc-pro` / `.pck` (`globals.css:790`) |
| **Target route** | `/pricing` **only** (owner decision). `/billing` (`BillingAccountPage`) is an account-status surface, not a plan table — **not in scope** |
| **Reusable behavior** | Three-column comparison with one visually distinguished plan; feature lists as parallel rows for line-by-line scanning; lifted lead card; hover elevation |
| **Retain from Narratix** | Plan names (Free / Pro / Team), prices ($0 / $10 / $15), every feature string, "COMING SOON" badges and `disabled` state on Pro and Team, `Start Free → /analyze` as the single primary CTA, Beta banner, closing Early-Access card |
| **Adapt from experiment** | Plan surface gains restrained material + `inset 0 1px 0` top highlight; lead plan lifted via `translateY(-10px)` at ≥900px only; badge repositioned to straddle the card edge; `✓` marks aligned in a fixed gutter so rows compare cleanly across cards |
| **Reject from experiment** | `lg-10-spin` (5s infinite conic-gradient border) — the exact generic-SaaS signature the brief rules out; `lg-10-glow` (2.4s infinite badge pulse); `@property --lg-10-angle`; the purple/teal/magenta conic palette; a second competing primary CTA |
| **Files likely to change** | `app/(main)/pricing/page.tsx`, `app/globals.css` (PRICING section) |
| **Risk** | **Low.** Static marketing page, no Stripe or plan-identifier code on it (`CheckoutButton` is not used here). Main risk is the lifted lead card causing overlap at tablet → mitigated by lifting only at ≥900px |
| **Accessibility requirements** | Plan cards as `<article>` with `aria-labelledby` → plan name; feature lists as real `<ul>/<li>` (currently `<div>`s, so screen readers get no list semantics or item count); `aria-disabled` + reason text on Coming Soon buttons; the "Most popular"-equivalent badge announced, not colour-only; contrast ≥4.5:1 on every price and feature row in all three themes — the current page hardcodes `rgba(255,255,255,…)` which **fails in light theme** |

---

## Component #3 — Dashboard Sidebar *(highest importance)*

| Field | Detail |
|---|---|
| **Source experiment** | `Comps of UI/liquid-glass-sidebar-navigation ( Dashboard ).html` (`.lg-15`) |
| **Current production component** | **None.** Narratix has no application shell. The authenticated shell is the fixed 56px top `components/layout/Navbar.tsx`. The only existing sidebar is the Settings section nav (`.stg-sidebar`), which is **out of scope** and stays as-is |
| **Owner decision** | Build a new persistent app-shell sidebar for authenticated routes, mirroring the Navbar's existing authed items and routes **exactly**. Corroborated by Design Lab triage A5 |
| **Target routes** | `/dashboard`, `/analyze`, `/history`, `/billing`, `/settings` |
| **Reusable behavior** | Persistent rail as the product's structural spine; collapse to icon-rail; capsule active state; account block pinned to the foot |
| **Retain from Narratix** | The **exact** four authed items and routes from `Navbar.authNavItems` — Dashboard `/dashboard`, Analyze `/analyze`, Reports `/history`, Billing `/billing`; the account block (avatar → initials fallback, display name, email); Settings `/settings`; `signOut()` from `useAuth`; logo, wordmark and 🧪 Beta badge; the existing mobile hamburger drawer, untouched |
| **Adapt from experiment** | Rail surface → Narratix `--card-bg` with a restrained translucent overlay and a `--border-secondary` right edge; active item → capsule at `--accent-light` with an `--accent` left marker **and** `aria-current="page"`; collapse toggle → persisted to `localStorage`, `.35s` → `--duration-normal` |
| **Reject from experiment** | `lg-15-float` — 14s infinite motion on the one element that must be stable; 24px blur (navigation must never blur what sits behind it); the three animated colour blobs; `oklch(0.66 0.18 285)` accent; geometric text glyphs (◆ ▤ ◫ ☰) as icons — replaced with consistent stroke SVGs; the CSS `:has()` checkbox hack — real React state instead; the rail's own dark-mode toggle (Narratix owns theme in Settings → Preferences) |
| **Breakpoint contract** | **≥1024px:** rail visible; `Navbar` keeps logo + account dropdown but its `.nav-links` are hidden (the rail owns navigation — no duplicate nav). **768–1023px:** rail hidden, current top nav links restored unchanged. **≤768px:** rail hidden, existing hamburger drawer unchanged |
| **Files likely to change** | New `components/layout/AppShell.tsx`, new `components/layout/SidebarNav.tsx`, new `components/layout/NavIcons.tsx`; `components/layout/Navbar.tsx` (add app-route class); `app/dashboard/page.tsx`, `app/analyze/page.tsx`, `app/history/page.tsx`, `app/billing/page.tsx`, `app/settings/page.tsx`; `app/globals.css` (new APP SHELL section) |
| **Risk** | **Medium — the highest of the four.** It is the only structural change. Specific risks: (a) duplicate navigation if the Navbar link hide fails → mitigated by a single `nav--app` class with one breakpoint; (b) content offset regressions, since each authed page owns its own top padding → mitigated by the shell adding **left** offset only and never touching top padding; (c) `/settings` nests its own `.stg-sidebar` inside the shell → mitigated by narrowing the outer rail and letting Settings keep its section nav; (d) fixed rail vs `body { overflow-x: hidden }` |
| **Accessibility requirements** | `<nav aria-label="Primary">` inside `<aside>`; `aria-current="page"` on the active item; collapse button as a real `<button>` with `aria-expanded` and a persistent accessible name; icon-only collapsed state keeps its accessible name via visually-hidden text (never `title` alone); full keyboard order rail → main; visible `:focus-visible` on every rail control; the rail must not be a keyboard trap; active state must survive high-contrast theme (hence the left marker, not just a tint) |

---

## Component #4 — Tactile Toggle

| Field | Detail |
|---|---|
| **Source experiment** | `Comps of UI/neumorphic-skeuomorphic-tactile-toggle-switch.html` (`.dm-07`) |
| **Current production component** | `Toggle` in `components/settings/SettingsPage.tsx:47` + `.stg-toggle` / `.stg-toggle-thumb` (`globals.css:1326`) |
| **Target route** | `/settings` → Notifications (3 switches: Analysis Complete, Weekly Summary, Marketing Emails) |
| **Reusable behavior** | The *ambition* only: a control that feels physical — press/release response, thumb travel with a hint of overshoot, a state change that reads as mechanical |
| **Retain from Narratix** | `role="switch"` + `aria-checked` semantics (already correct); accent-fill on-state; existing 40×22px geometry and `.stg-toggle-row` layout; all three toggles' state and `handleSaveNotifications` persistence; existing colors, surfaces, typography, settings layout |
| **Adapt from experiment** | Add `:active` press physics — thumb squashes horizontally and the track compresses, releasing on pointer-up; thumb travel curve → `--ease-spring`, retimed to `--duration-normal` (200ms); a subtle inset track groove (1px, token-based) for depth **only** |
| **Reject from experiment** | The entire neumorphic language — dual light/dark offset shadows, extruded shell, inset-press surface; the neon cyan glow; the `#e8ecf2` / `#1a1e2a` palette; the 0.4–0.6s transitions (3–4× too slow for a switch); `☀`/`🌙` emoji thumb icons; the indicator dots; the demo cards |
| **Why not the neumorphism** | Design Lab triage A8 rejects it on measurement, not taste: neumorphism encodes state as *shadow direction*, so ON and OFF have identical foreground/background contrast, and it disappears entirely in `[data-theme="high-contrast"]` — which Narratix already ships. This matches the owner's own §7 constraint that ON/OFF must be obvious without relying on shadows alone |
| **Files likely to change** | `components/settings/SettingsPage.tsx` (Toggle only), `app/globals.css` (`.stg-toggle` block) |
| **Risk** | **Low.** One leaf component, three call sites, no logic change |
| **Accessibility requirements** | Keep `role="switch"` + `aria-checked`; add the missing accessible name — the switches currently have **no** label association, only adjacent `.stg-toggle-label` text (add `aria-labelledby` → the label span, plus `aria-describedby` → the description); add a text ON/OFF state signal so state never depends on colour or shadow; enlarge the hit area to ≥44px via padding without changing visual size; verify in high-contrast; press physics must collapse under `prefers-reduced-motion` |

---

## Out of scope — documented, not fixed

| # | Finding | Location | Why not fixed |
|---|---|---|---|
| 1 | **`--nl-*` tokens are never defined.** `UploadPanel.tsx` uses Tailwind classes `bg-nl-panel`, `border-nl-border`, `shadow-nl-card`, `from-nl-primary`, `to-nl-primaryDark`, `shadow-nl-glow`. `tailwind.config.js` maps these to `var(--nl-bg)`, `var(--nl-panel)` etc., but **no `--nl-*` variable is defined anywhere in the codebase.** The panel therefore renders with no background, no border, no shadow and no gradient on its primary button | `components/dashboard/UploadPanel.tsx:35,116`; `tailwind.config.js` | §12 — outside the four-component scope. Confirms the earlier audit |
| 2 | **`.grid-bg` is undefined.** Used as the auth background but has no CSS rule | `components/auth/LoginForm.tsx:86`, `SignupForm.tsx:129` | Inside Component #1's scope (the login backdrop is exactly what that component governs) — **will be fixed as part of #1** |
| 3 | **Hardcoded `#fff` / `rgba(255,255,255,…)` breaks light theme.** Widespread on `/pricing`, `AccountPages.tsx`, `DashboardContent.tsx` | multiple | Fixed **only** on `/pricing`, where Component #2 already rewrites the surface. Everywhere else: documented only |

---

## Implementation order (per brief §13)

1. **Sidebar** — establishes the shell integration pattern
2. **Login** — establishes the glass material treatment
3. **Pricing** — establishes premium commercial UI
4. **Toggle** — establishes tactile micro-interaction

After each: typecheck · lint · responsive check (390 / 768 / 1024 / 1440 / 1920) · accessibility check · verify existing functionality.

**No backend changes. No deployment.** Ends at `READY FOR OWNER VISUAL APPROVAL`.
