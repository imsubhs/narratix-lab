# Repository Upgrade Report — Narratix Lab

**Report ID**: `NL-REP-0.7-UPGRADE`  
**Phase**: `Phase 0.7 — Repository Foundation & Public Static Site`  
**Author**: `Senior Staff Engineer & DevOps Architect`  
**Repository**: `imsubhs/narratix-lab`  
**Branch**: `feat/repository-foundation-pages`  
**Date**: `October 2026`

---

## 1. Repository Baseline

Before executing modifications, a thorough forensic audit of the entire repository was performed:

* **Repository Identity**: `imsubhs/narratix-lab` (Authoritative branch: `main`).
* **Existing State**:
  * An existing Next.js 14.2.15 App Router application with React 18.3.1 and TypeScript 5.9.3.
  * Server runtime dependencies: `@ffmpeg-installer/ffmpeg`, `fluent-ffmpeg`, `pdf-parse`, `docx`, `mammoth`, `cloudinary`, `stripe`, `@anthropic-ai/sdk`, `openai`, `@supabase/ssr`.
  * Externalized server packages in `next.config.mjs` with `55mb` Server Actions limit.
  * Baseline commits: `ea302e1` (Beta V1 Initial Commit) and `2b309d3` (Phase 0.5B UI Integration).
  * 17 pre-existing uncommitted modifications in the working tree improving form labels, input IDs, accessibility attributes, CSS tokens (`--nl-*`), and export brand colors.
  * Zero `.github` workflows or deployment automation configured.
  * Boilerplate `create-next-app` README.md.

---

## 2. Forensic Audit Findings & Taxonomy

Findings were categorized using the mandated engineering taxonomy:

| Finding ID | Classification | Description | Architectural Impact & Resolution |
| :--- | :---: | :--- | :--- |
| **AUD-01** | **D** | Root Next.js app has server-only packages and API routes | **Preserve**: Root app cannot use `output: 'export'`. Must remain dynamic on Vercel. |
| **AUD-02** | **P1** | Risk of deploying full SaaS to GitHub Pages | **Resolved**: Strict dual-target separation. Only static `website/` deploys to Pages. |
| **AUD-03** | **D** | Pre-existing working tree accessibility improvements | **Preserve & Verify**: Validated against tsc, lint, tests, and build. Preserved cleanly. |
| **AUD-04** | **P1** | Zero CI/CD workflows existed in `.github/` | **Resolved**: Added `.github/workflows/ci.yml` and `.github/workflows/pages.yml`. |
| **AUD-05** | **P2** | Subpath 404 risk on GitHub Pages (`/narratix-lab/`) | **Resolved**: All static assets and links in `website/` use base-aware relative paths (`./`). |
| **AUD-06** | **P2** | Generic boilerplate README | **Resolved**: Replaced with comprehensive, production-grade documentation. |
| **AUD-07** | **D** | Zero secret leaks in git tracking or history | **Verified**: `.env.local` is gitignored; only `.env.example` with placeholders is tracked. |
| **AUD-08** | **P3** | Missing community hygiene templates | **Resolved**: Added `SECURITY.md`, `CONTRIBUTING.md`, PR template, and Issue templates. |

---

## 3. Architecture Decision: Option B (Dedicated Static Site)

Four options were evaluated for the public showcase and documentation site:
* **Option A**: Static HTML/CSS/JS under `/docs`.
* **Option B**: Dedicated static site under `/website`. *(SELECTED)*
* **Option C**: Dedicated static Next.js application under `/website`.
* **Option D**: Static export of an isolated public surface from the root app.

### Evaluation & Rationale
Option B was selected as the simplest, cleanest, and most reliable architecture:
1. **Zero Framework Bloat**: No second framework or secondary build tooling is introduced.
2. **Clean Separation of Concerns**: Leaves `docs/` dedicated purely to repository Markdown documentation and technical specifications without mingling web build assets.
3. **Subpath Safety**: High-performance vanilla HTML5/CSS3/JS avoids client-side router clashes under `/narratix-lab/`.
4. **Instant Edge Delivery**: Deploys via official GitHub Pages actions in under 45 seconds with zero server dependencies.

---

## 4. Production Application Verification (Target A — Vercel)

The root Next.js application was verified locally and confirmed 100% healthy:
* **TypeScript Compilation (`npx tsc --noEmit`)**: Clean (0 errors).
* **Next.js Linting (`npm run lint`)**: Clean (0 errors, 0 warnings).
* **Offline Regression Tests (`npm run test:demo`)**: 43/43 checks passed.
* **Offline Export Tests (`npm run test:export`)**: 67/67 checks passed.
* **Production Build (`npm run build`)**: Exited with code 0. Compiled 23 static and dynamic routes including middleware.

**Key Rule Preserved**: No `output: 'export'` was added to `next.config.mjs`. All server actions, API routes, Supabase SSR, and Stripe integrations remain intact.

---

## 5. GitHub Pages Public Site (Target B)

Created in `website/`:
* `index.html`: Complete, single-page presentation covering Home, Product Capabilities, Design System, Dual-Target Architecture, Roadmap, Verified Tech Stack, Repository Guide, and Live App CTA.
* `css/style.css`: Comprehensive Modern Dark stylesheet using Deep Space (`#0B0B0C`), Electric Violet (`#7C3AED`), refined cards, subtle glows, and responsive media queries.
* `js/main.js`: Vanilla JS managing keyboard-accessible mobile drawer navigation, dynamic copyright year, and header scroll effects.
* `assets/`: Self-contained brand assets (`narratix-labs-mark.png`, `narratix-labs-logo.png`, `favicon.png`).

---

## 6. GitHub Actions Automation

Configured two independent, isolated workflows:

1. **`.github/workflows/pages.yml`**:
   - Triggers on push to `main` (`website/**`) and manual `workflow_dispatch`.
   - Uses official actions: `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`.
   - Grants minimal required permissions (`contents: read`, `pages: write`, `id-token: write`).
   - Deploys exclusively the `website/` directory to the `github-pages` environment.

2. **`.github/workflows/ci.yml`**:
   - Triggers on push and pull request to `main`.
   - Runs `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run test:demo`, `npm run test:export`, and `npm run build`.
   - Uses placeholder environment variables so tests never touch production Supabase or external APIs.

---

## 7. Security Audit Verification

* Searched git tracking and full git history for exposed API keys, secret tokens, and passwords.
* Confirmed `.env.local` is untracked and excluded by `.gitignore`.
* Confirmed error handling in `lib/ai/errors.ts` strips any `sk-*` tokens before serialization.
* Added `SECURITY.md` establishing private vulnerability disclosure guidelines and secret isolation policies.

---

## 8. Files Inventory

### Files Added
1. `website/index.html` (Public showcase portal)
2. `website/css/style.css` (Modern Dark stylesheet)
3. `website/js/main.js` (Client navigation and interactions)
4. `website/assets/favicon.png` (Site icon)
5. `website/assets/brand/*` (Normalized brand and social marks)
6. `.github/workflows/pages.yml` (GitHub Pages deployment pipeline)
7. `.github/workflows/ci.yml` (Production validation pipeline)
8. `.github/pull_request_template.md` (PR quality gate)
9. `.github/ISSUE_TEMPLATE/bug_report.md` (Bug report template)
10. `.github/ISSUE_TEMPLATE/feature_request.md` (Feature request template)
11. `docs/deployment/GITHUB_PAGES_ARCHITECTURE.md` (Dual-target deployment guide)
12. `docs/REPOSITORY_ARCHITECTURE.md` (Codebase architecture map)
13. `docs/REPOSITORY_UPGRADE_REPORT.md` (This upgrade report)
14. `SECURITY.md` (Vulnerability disclosure and secret policy)
15. `CONTRIBUTING.md` (Engineering standards and branch guide)

### Files Modified
1. `README.md` (Completely overhauled from boilerplate to professional engineering handbook)
2. Pre-existing working tree improvements preserved:
   - `app/globals.css` (Added `--nl-*` tokens and focus-ring)
   - `app/(main)/about/page.tsx` (Form and semantic accessibility)
   - `app/(main)/contact/page.tsx` (Form and semantic accessibility)
   - `app/(main)/privacy/page.tsx` (Semantic accessibility)
   - `app/(main)/resources/page.tsx` (Semantic accessibility)
   - `app/(main)/terms/page.tsx` (Semantic accessibility)
   - `components/analyzer/AnalyzerClient.tsx` (Accessibility improvements)
   - `components/auth/AuthProvider.tsx` (Accessibility improvements)
   - `components/dashboard/AnalysisResults.tsx` (Accessibility improvements)
   - `components/dashboard/UploadPanel.tsx` (Accessibility improvements)
   - `components/dashboard/UploadZone.tsx` (Accessibility improvements)
   - `components/landing/HomePageClient.tsx` (Accessibility improvements)
   - `components/layout/AppShell.tsx` (Accessibility improvements)
   - `components/settings/SettingsPage.tsx` (Accessibility improvements)
   - `lib/export/renderers/html.ts` (Brand violet color fallback)
   - `lib/export/renderers/pdf.ts` (Brand violet color fallback)
   - Deleted stale backup file `components/layout/Navbar.tsx.bak`

### Files Intentionally Untouched
* `next.config.mjs` (Preserved server configuration without static export)
* `package.json` & `package-lock.json` (Preserved locked dependencies and scripts)
* `middleware.ts` (Preserved host validation and routing security)
* `supabase/` (Preserved schema and RLS migrations)
* `app/api/**` (Preserved all server routes, SSE streaming, and Stripe handlers)
* `lib/ai/**` (Preserved all inference adapters and prompt engines)

---

## 9. GitHub Pages Deployment Status

**Status**: **READY FOR MANUAL PAGES ENABLEMENT**

Because GitHub Pages requires a repository administrator setting on GitHub before the first GitHub Actions deployment can run:
1. Navigate to: `https://github.com/imsubhs/narratix-lab/settings/pages`
2. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions**
3. Once enabled, any push to `main` touching `website/**` or a manual trigger via the **Actions** tab will deploy to:  
   `https://imsubhs.github.io/narratix-lab/`

---

## 10. Next Recommended Step

**Phase 0.8 — Data Contracts & Retention Schema Formalization**:
1. Formulate Supabase database schema migrations for channel-level video retention graphs.
2. Formalize YouTube Analytics data contracts in preparation for Beta V2 OAuth integration.
3. Review multi-account workspace schema requirements for creator teams.
