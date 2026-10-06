# Repository Architecture & Codebase Map — Narratix Lab

**Document ID**: `NL-DOC-ARCH-001`  
**Phase**: `0.7 — Repository Foundation & Public Static Site`  
**Repository**: `imsubhs/narratix-lab`  
**Status**: `Active / Authoritative`

---

## 1. Executive Overview

Narratix Lab is a dual-target Next.js codebase structured to balance a production-grade, server-dependent SaaS application (Vercel) with an autonomous, high-availability public static showcase and documentation portal (GitHub Pages).

This architecture eliminates framework collisions, ensures secrets remain isolated on server runtimes, and provides verifiable offline regression testing.

---

## 2. Directory Tree Map

```
narratix-lab/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md             # Standardized bug reporting template
│   │   └── feature_request.md        # Feature request submission template
│   ├── workflows/
│   │   ├── ci.yml                    # Automated build, lint, typecheck & offline tests
│   │   └── pages.yml                 # GitHub Pages deployment pipeline
│   └── pull_request_template.md      # Pull request quality & safety checklist
│
├── app/                              # Next.js 14 App Router (Target A — Production SaaS)
│   ├── (auth)/                       # Isolated auth layouts (login, signup)
│   ├── (main)/                       # Informational static/marketing pages (about, contact, terms)
│   ├── analyze/                      # Core interactive script analyzer UI
│   ├── api/                          # Server-side API routes (streaming SSE, webhooks, auth)
│   │   ├── account/                  # Account data export & GDPR deletion routes
│   │   ├── ai/health/                # Zero-token provider healthcheck probe
│   │   ├── analyze/                  # Multi-provider streaming analysis endpoint
│   │   ├── auth/callback/            # Supabase SSR cookie exchange handler
│   │   └── stripe/                   # Stripe checkout & webhook listener
│   ├── billing/                      # Subscription tier management & portal redirect
│   ├── dashboard/                    # Recent analyses, project management, and uploads
│   ├── history/                      # Historical reports archive
│   ├── report/[id]/                  # Canonical report rendering view
│   ├── reports/[id]/                 # Alternate view route
│   ├── settings/                     # User preferences, security, and MCP integrations
│   ├── ui-review/                    # Gated UI review tool (disabled in production)
│   ├── globals.css                   # Global Modern Dark tokens and utility classes
│   └── layout.tsx                    # Root HTML layout, font loaders, metadata
│
├── components/                       # Modular React 18 UI components
│   ├── account/                      # Account management widgets
│   ├── analyzer/                     # Real-time script analyzer client components
│   ├── auth/                         # Liquid-glass login/signup cards & AuthProvider
│   ├── billing/                      # Pricing tables & plan selector
│   ├── brand/                        # BrandMark & unified company assets
│   ├── dashboard/                    # Analysis results, upload panel, and drop zones
│   ├── landing/                      # Production landing page client components
│   ├── layout/                       # Collapsible AppShell, navigation rail, and footers
│   └── settings/                     # Tactile toggles & MCP settings tabs
│
├── lib/                              # Core business logic, SDK wrappers & engines
│   ├── ai/                           # Multi-provider AI inference waterfall
│   │   ├── demo.ts                   # Stage 7A deterministic zero-cost demo builder
│   │   ├── demo-profiles/            # 10 curated, schema-valid benchmark profiles
│   │   ├── errors.ts                 # Sanitized error hierarchy with secret stripping
│   │   ├── providers/                # Anthropic, OpenAI & OpenRouter adapters
│   │   └── validate.ts               # Schema validation routines for LLM outputs
│   ├── export/                       # Stage 8B Professional Export System
│   │   ├── index.ts                  # Canonical report model transformer
│   │   └── renderers/                # Serializers for PDF, DOCX, Markdown, HTML, TXT, RTF
│   ├── supabase/                     # Supabase client factories (browser, server, admin)
│   ├── file-security.ts              # File upload type verification & MIME inspection
│   └── video-processor.ts            # Video transcript & audio extraction routines
│
├── local-review/                     # Isolated local visual review tooling (npm run review)
│   ├── mock-supabase.js              # Mock session server for offline component reviews
│   ├── review-server.js              # Standalone Express-based preview server
│   └── start.js                      # Launcher script
│
├── public/                           # Static assets for the production Next.js application
│   ├── brand/                        # Official high-resolution marks & social icons
│   └── ui-review/                    # Review fixture captures
│
├── scripts/                          # Engineering scripts and offline test runners
│   ├── ai-pipeline-tests.ts          # AI waterfall unit and failover tests
│   ├── demo-tests.ts                 # Stage 7A offline regression test suite (43 checks)
│   ├── export-tests.ts               # Stage 8B offline export test suite (67 checks)
│   └── startup-validation.ts         # Zero-token provider & model readiness probe
│
├── supabase/                         # Database schema migrations & SQL policies
│   └── migrations/                   # Row-Level Security policies and tables
│
├── website/                          # Target B — Public Static Project Site (GitHub Pages)
│   ├── assets/                       # Localized brand assets and favicon (subpath safe)
│   ├── css/style.css                 # Standalone Modern Dark design system stylesheet
│   ├── js/main.js                    # Accessible vanilla JS client logic
│   └── index.html                    # Public project showcase, architecture & docs portal
│
├── docs/                             # Permanent repository technical documentation
│   ├── architecture/                 # System diagrams and schema contracts
│   └── deployment/                   # Deployment guides (GitHub Pages, Vercel)
│
├── CONTRIBUTING.md                   # Engineering standards, branching and PR rules
├── SECURITY.md                       # Vulnerability reporting & secret protection policy
└── README.md                         # Official repository overview and developer handbook
```

---

## 3. Separation of Concerns & Boundary Enforcement

| Dimension | Target A (Production SaaS) | Target B (Public Static Portal) |
| :--- | :--- | :--- |
| **Location** | Root Next.js application (`app/`, `components/`) | Subdirectory (`website/`) |
| **Deployment Target** | Vercel | GitHub Pages |
| **Workflow** | `.github/workflows/ci.yml` (validates only) | `.github/workflows/pages.yml` (deploys) |
| **Runtime Dependency** | Node.js, C++ bindings (FFmpeg), WebSockets | Pure static file serving |
| **Authentication** | Supabase SSR Cookie Exchange | Zero authentication |
| **Database** | Supabase Postgres with RLS | Zero database access |
| **Secrets Exposure** | Server-side only via Vercel env | Strictly forbidden (Zero secrets) |

---

## 4. Testing & Quality Assurance Model

The repository separates testing into two tiers:

1. **Offline Regression Suites (Run on every CI build)**:
   - `npm run test:demo`: Executes 43 automated checks validating that all 10 curated profiles conform to strict JSON schemas, deterministic style selection, and zero-cost demo integrity.
   - `npm run test:export`: Executes 67 automated checks ensuring that all 6 document formats (PDF, DOCX, Markdown, HTML, TXT, RTF) serialize without data loss and never leak telemetry or secrets.
   - **Zero network calls**: These tests never touch external APIs or live database instances.
2. **Online Integration Suites (Run manually or in staging)**:
   - `tests/regression_test.js`: Full Playwright E2E lifecycle test requiring live Supabase credentials and browser automation.
   - `scripts/startup-validation.ts`: Free GET `/v1/models` probes to verify active API key validity.
