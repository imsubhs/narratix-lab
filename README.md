# Narratix Lab

> Engineering-grade creator intelligence, video retention diagnostics, and multi-format report generation for high-throughput video creators.

[![CI — Production Validation](https://github.com/imsubhs/narratix-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/imsubhs/narratix-lab/actions/workflows/ci.yml)
[![Deploy Public Static Site](https://github.com/imsubhs/narratix-lab/actions/workflows/pages.yml/badge.svg)](https://github.com/imsubhs/narratix-lab/actions/workflows/pages.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Status-Beta%20V1%20Live-brightgreen)](https://narratix-lab.vercel.app/)

---

## Project Status

**Current Phase**: Phase 0.7 — Repository Modernization & Public Static Site  
**Release Baseline**: Beta V1 Production Live (with Phase 0.5B Modern Dark UI Integration)  
**Production Health**: Active on Vercel with 100% offline-passing regression suites.

---

## Live Deployments & Repository Links

* **Live Application (Target A)**: [https://narratix-lab.vercel.app/](https://narratix-lab.vercel.app/)  
  *Full Next.js server runtime, Supabase SSR auth, Stripe billing, and AI waterfall.*
* **Public Project Site (Target B)**: [https://imsubhs.github.io/narratix-lab/](https://imsubhs.github.io/narratix-lab/)  
  *Zero-secret static documentation, architecture diagrams, and design system showcase.*
* **GitHub Repository**: [https://github.com/imsubhs/narratix-lab](https://github.com/imsubhs/narratix-lab)  
  *Authoritative repository on default branch `main`.*

---

## Features (Implemented & Verified)

1. **Creator Intelligence Engine**:
   - Automated script analysis evaluating narrative structure, hook urgency, and emotional resonance.
   - Pacing diagnostics calculating cognitive load and Flesch-Kincaid readability indices.
2. **Retention Hazard Detection**:
   - Identifies exposition bottlenecks, conversational drag, and early drop-off points before recording.
   - Generates actionable, structured remediation plans mapped to specific script sections.
3. **Stage 8B Professional Multi-Format Export**:
   - Compiles a single canonical report model into **6 deterministic output formats**:
     - **PDF**: Vector layout with brand typography and score cards.
     - **Word (.docx)**: Native Microsoft Word document with tables and callout styling.
     - **Markdown (.md)**: GitHub-flavored Markdown with pipe tables and task lists.
     - **HTML (.html)**: Self-contained, responsive standalone web document.
     - **Plain Text (.txt)**: Fixed-width formatted text report.
     - **Rich Text (.rtf)**: Formatted RTF document with bold/italic styling.
4. **Resilient Multi-Provider AI Waterfall**:
   - Zero-downtime inference architecture: **Claude 3.5 Sonnet** (primary) $\rightarrow$ **OpenAI GPT-4o** (secondary) $\rightarrow$ **OpenRouter** (tertiary fallback).
   - Automatic exponential backoff retries and strict secret sanitization in logging.
5. **Stage 7A Zero-Cost Demo Mode**:
   - 10 curated, schema-valid benchmark profiles for immediate sandbox demonstrations at zero API cost.
6. **Modern Dark Design System (Phase 0.5B)**:
   - Calibrated Deep Space (`#0B0B0C`) canvas, Electric Violet (`#7C3AED`) accents, and tactile settings toggle.
   - Collapsible dashboard navigation rail and MCP (Model Context Protocol) integration surface.

---

## System Architecture

Narratix Lab enforces a clean separation of deployment boundaries:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NARRATIX LAB REPOSITORY                        │
└────────────────────┬───────────────────────────────┬────────────────────┘
                     │                               │
                     ▼                               ▼
        TARGET A: PRODUCTION SAAS        TARGET B: PUBLIC PROJECT PORTAL
        Platform: Vercel                 Platform: GitHub Pages
        Runtime: Next.js 14 App Router   Runtime: Static HTML5 / CSS3 / JS
        Path: root (app/, components/)   Path: website/
        Capabilities:                    Capabilities:
        • Supabase SSR & Postgres        • Zero-dependency static files
        • Stripe Webhooks & Billing      • Subpath-safe (/narratix-lab/)
        • 55MB Server Actions            • System architecture diagrams
        • Anthropic / OpenAI / OpenRouter• Verified tech stack docs
        • Video / Document Parsers       • ZERO server secrets
```

For complete architecture details, see [docs/deployment/GITHUB_PAGES_ARCHITECTURE.md](docs/deployment/GITHUB_PAGES_ARCHITECTURE.md) and [docs/REPOSITORY_ARCHITECTURE.md](docs/REPOSITORY_ARCHITECTURE.md).

---

## Technology Stack

All dependencies are verified from `package.json`:

- **Framework**: Next.js 14.2.15 (App Router, Server Actions, Edge Middleware)
- **UI Library**: React 18.3.1
- **Language**: TypeScript 5.9.3 (Strict Mode)
- **Styling**: Tailwind CSS 3.4.17 with custom `--nl-*` CSS tokens
- **Auth & Database**: `@supabase/ssr` 0.5.2 & `@supabase/supabase-js` 2.49.0
- **AI SDKs**: `@anthropic-ai/sdk` 0.110.0 & `openai` 4.57.0
- **Payments**: `stripe` 17.5.0
- **Document Export**: `jspdf` 4.2.1 & `docx` 9.7.1
- **Media Ingestion**: `fluent-ffmpeg` 2.1.3 & `cloudinary` 2.9.0
- **Testing & Tooling**: Playwright 1.61.0 & tsx 4.23.0

---

## Local Development

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/imsubhs/narratix-lab.git
   cd narratix-lab
   ```

2. **Install exact dependencies**:
   ```bash
   npm ci
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   *(By default, `DEMO_MODE=true` is enabled in `.env.example`, allowing full local testing without paid API keys).*

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables Reference

Environment variable names expected by the Next.js production application (never commit actual values):

```env
# Supabase (Auth + Database)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# AI Providers (Waterfall)
ANTHROPIC_API_KEY
OPENAI_API_KEY
OPENROUTER_API_KEY
DEMO_MODE

# Payments (Stripe)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRO_PRICE_ID
STRIPE_TEAM_PRICE_ID

# Media & Application
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
NEXT_PUBLIC_APP_URL
ALLOWED_HOSTS
```

---

## Testing & Quality Assurance

Narratix Lab includes offline regression suites that validate system behavior with zero network calls:

```bash
# Typecheck
npx tsc --noEmit

# Linting
npm run lint

# Offline Demo Mode Regression Tests (Stage 7A — 43 tests)
npm run test:demo

# Offline Professional Export System Tests (Stage 8B — 67 tests)
npm run test:export

# Full Production Next.js Build
npm run build
```

---

## Deployment Strategy

* **Production Application $\rightarrow$ Vercel**:
  - Automatically triggered on push to `main` via Vercel GitHub integration.
  - Deploys full Next.js server runtime with API routes, Server Actions, and Supabase connections.
* **Public Project Site $\rightarrow$ GitHub Pages**:
  - Driven by `.github/workflows/pages.yml`.
  - Deploys only the static `website/` artifact to `https://imsubhs.github.io/narratix-lab/`.
  - Requires **Source: GitHub Actions** under repository Settings $\rightarrow$ Pages.

---

## Documentation Index

- [docs/deployment/GITHUB_PAGES_ARCHITECTURE.md](docs/deployment/GITHUB_PAGES_ARCHITECTURE.md): Complete deployment boundary rationale and guide.
- [docs/REPOSITORY_ARCHITECTURE.md](docs/REPOSITORY_ARCHITECTURE.md): Codebase map, module breakdown, and data contracts.
- [docs/REPOSITORY_UPGRADE_REPORT.md](docs/REPOSITORY_UPGRADE_REPORT.md): Forensic audit findings, P0–D classifications, and upgrade log.
- [SECURITY.md](SECURITY.md): Security policy, secret protection, and vulnerability disclosure.
- [CONTRIBUTING.md](CONTRIBUTING.md): Engineering standards and contribution checklist.

---

## Roadmap

### Completed
- [x] Beta V1 Core SaaS Architecture on Vercel
- [x] Stage 7A Curated Demo Profile Engine (10 profiles, zero API cost)
- [x] Stage 8B Professional Export Suite (PDF, Word, Markdown, HTML, TXT, RTF)
- [x] Phase 0.5B Modern Dark UI Integration (MCP Settings, Liquid-Glass Auth)

### Current Phase (Phase 0.7)
- [x] Repository forensic audit & classification (P0–D)
- [x] Dedicated zero-dependency static project showcase (`website/`)
- [x] GitHub Pages deployment pipeline (`.github/workflows/pages.yml`)
- [x] GitHub Actions automated production validation (`.github/workflows/ci.yml`)
- [x] Comprehensive architecture and deployment documentation suite

### Next Step (Phase 0.8)
- [ ] Retention profile database schema expansion
- [ ] YouTube Data contract formalization & rate-limit guards
- [ ] Multi-tenant workspace preparation

### Future Vision (Beta V2)
- [ ] Direct YouTube OAuth 2.0 integration & channel analytics ingestion
- [ ] Temporal curve alignment engine (second-by-second drop-off mapping)
- [ ] Interactive AI Copilot for timeline script restructuring

---

## Security

Narratix Lab enforces a zero-secrets policy in source code. All production API tokens (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, etc.) reside exclusively in secure server environment variables. See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## License

Proprietary. All rights reserved &copy; 2026 Narratix Labs.
*(Package marked `"private": true` in `package.json`)*.
