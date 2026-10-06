# GitHub Pages Architecture & Deployment Guide — Narratix Lab

**Document ID**: `NL-DOC-DEP-001`  
**Phase**: `0.7 — Repository Foundation & Public Static Site`  
**Status**: `Active / Authoritative`  
**Target URL**: `https://imsubhs.github.io/narratix-lab/`

---

## 1. Architectural Boundary & Executive Summary

Narratix Lab operates with a strict **dual-target deployment architecture**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NARRATIX LAB CODEBASE                           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       TARGET A: PRODUCTION SAAS         TARGET B: PUBLIC PROJECT PORTAL
       Platform: VERCEL                  Platform: GITHUB PAGES
       Runtime: Next.js 14 (Node.js)     Runtime: Static HTML5/CSS3/JS
       URL: narratix-lab.vercel.app      URL: imsubhs.github.io/narratix-lab
       Features:                         Features:
       • Supabase SSR Auth & DB          • Zero-secret project overview
       • Stripe Billing & Webhooks       • Modern Dark Design System docs
       • 55MB Server Actions             • System architecture diagrams
       • Claude / OpenAI / OpenRouter    • Verified technology stack
       • FFmpeg & Cloudinary uploads     • Milestone roadmap & local setup
```

---

## 2. Why the Full SaaS Cannot Run on GitHub Pages

GitHub Pages is a **static web server** designed to host static files (HTML, CSS, JavaScript, WebAssembly, images, and fonts). It does **not** provide a server-side execution environment.

Attempting to run the full Narratix Lab SaaS application on GitHub Pages would catastrophically fail due to the following hard dependencies in our production codebase:

1. **Dynamic Server Actions with High Payload Limits**:
   - `next.config.mjs` explicitly configures `serverActions.bodySizeLimit: '55mb'` for handling large video/audio script and transcript ingestions. GitHub Pages cannot run Node.js Server Actions.
2. **Server-Side API Routes**:
   - `/api/analyze/route.ts` runs streaming Server-Sent Events (SSE) using Edge/Node runtimes to communicate with Anthropic, OpenAI, and OpenRouter.
   - `/api/stripe/webhook/route.ts` requires raw request body cryptographic signature verification (`stripe.webhooks.constructEvent`), impossible in static hosting.
   - `/api/auth/callback/route.ts` sets secure HTTP-only cookies via `@supabase/ssr`.
3. **External Server-Only Packages**:
   - `next.config.mjs` configures `serverComponentsExternalPackages`:
     - `fluent-ffmpeg`
     - `@ffmpeg-installer/ffmpeg`
     - `@anthropic-ai/sdk`
     - `openai`
     - `pdf-parse`
     - `pdfjs-dist`
   - These packages require a Node.js C++ runtime or binary bindings that cannot execute in a browser sandbox.
4. **Secrets & Security Isolation**:
   - The production SaaS requires sensitive private tokens (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`).
   - If a Next.js app is converted to a static export (`output: 'export'`), server secrets cannot be accessed at runtime, and any hardcoded fallback would expose critical infrastructure credentials to the public web.

---

## 3. What Runs Where

| System Capability | Target A: Vercel (Production SaaS) | Target B: GitHub Pages (Showcase Portal) |
| :--- | :---: | :---: |
| **Runtime Environment** | Next.js 14 Node.js Server + Edge Middleware | Static Web Server (Edge CDN) |
| **Hosting Source** | Root repository (`app/`, `components/`, `lib/`) | Dedicated `website/` directory |
| **Authentication** | Supabase SSR (Cookie session handling) | None (Public access) |
| **Database Access** | Supabase PostgreSQL via RLS | None |
| **Billing & Webhooks** | Stripe Customer Portal & Webhooks | None |
| **AI Inference** | Claude Sonnet 3.5, GPT-4o, OpenRouter | None |
| **Export Engines** | Server-side & client-side jsPDF / docx | None |
| **Design System Docs** | None | Full interactive token showcase |
| **Architecture Flow** | Production execution | Full visual system diagrams |
| **Environment Secrets** | Required (`.env.local` / Vercel Settings) | **Forbidden** (Zero secrets) |

---

## 4. How the Static Public Site is Built & Structured

The public site is isolated inside the `website/` directory:

```
website/
├── index.html              # Semantic HTML5 single-page application & showcase
├── css/
│   └── style.css           # Modern Dark design system tokens, layout, and utilities
├── js/
│   └── main.js             # Accessible mobile navigation, scroll observers, year sync
└── assets/
    ├── favicon.png         # Site favicon
    └── brand/              # Normalized brand marks and vector assets
        ├── narratix-labs-mark.png
        ├── narratix-labs-logo.png
        ├── youtube.png
        ├── discord.png
        └── linkedin.png
```

### Key Implementation Principles

1. **Zero External Framework Overhead**:
   - No React or Next.js build step is required for `website/`. This ensures near-zero second deployment, zero runtime dependency risk, and immune stability against upstream framework breakages.
2. **Subpath Safety (`/narratix-lab/`)**:
   - Because GitHub Pages serves project repositories at `https://<owner>.github.io/<repo>/`, absolute paths like `/assets/logo.png` would attempt to resolve from the domain root (`https://<owner>.github.io/assets/logo.png`), resulting in `404 Not Found`.
   - All internal links, stylesheet references, and image paths use **relative paths** (`./css/style.css`, `./assets/...`, `#product`). This guarantees seamless operation on `localhost`, local file systems, and the GitHub Pages subpath.
3. **Modern Dark Design Consistency**:
   - Directly mirrors the verified `app/globals.css` visual language: Deep Space background (`#0B0B0C`), Electric Violet brand accent (`#7C3AED`), Plus Jakarta Sans typography, and subtle micro-borders.

---

## 5. Deployment Pipeline (.github/workflows/pages.yml)

The static showcase site is automatically deployed via GitHub Actions whenever changes are merged into `main` affecting `website/**` or `.github/workflows/pages.yml`.

### Deployment Lifecycle

```
[Push to main (website/**)] OR [workflow_dispatch]
                      │
                      ▼
            Job: build (ubuntu-latest)
            1. Checkout repository (actions/checkout@v4)
            2. Configure Pages (actions/configure-pages@v5)
            3. Validate static files (index.html, style.css, main.js)
            4. Upload Pages artifact (actions/upload-pages-artifact@v3)
                      │
                      ▼
            Job: deploy (environment: github-pages)
            5. Deploy to Pages (actions/deploy-pages@v4)
                      │
                      ▼
         Site live at https://imsubhs.github.io/narratix-lab/
```

### Required Permissions

The workflow declares precise, least-privilege permissions:
```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

---

## 6. How to Update the Public Site

1. Edit files directly within `website/`:
   - Content & copy: `website/index.html`
   - Styles & tokens: `website/css/style.css`
   - Client scripts: `website/js/main.js`
   - Brand images: `website/assets/`
2. Test changes locally in a browser:
   ```bash
   # Open directly or use any lightweight static server:
   npx serve website
   ```
3. Commit and push on a feature branch:
   ```bash
   git checkout -b feat/update-public-site
   git add website/
   git commit -m "feat: update public showcase roadmap"
   git push origin feat/update-public-site
   ```
4. Merge into `main` via Pull Request. GitHub Actions will trigger and deploy the new static bundle in under 45 seconds.

---

## 7. Troubleshooting Deployment

### Issue 1: GitHub Pages 404 or "Page Not Found"
- **Cause**: GitHub Pages has not yet been enabled in the repository settings, or the source is misconfigured.
- **Resolution**:
  1. Open the repository on GitHub: `https://github.com/imsubhs/narratix-lab`
  2. Navigate to **Settings** → **Pages** (under the "Code and automation" section).
  3. Under **Build and deployment**:
     - **Source**: Select **GitHub Actions** (do NOT select "Deploy from a branch").
  4. Once set to GitHub Actions, re-run the `Deploy Public Static Site to GitHub Pages` workflow manually via the **Actions** tab.

### Issue 2: Broken Images or CSS on GitHub Pages
- **Cause**: An asset reference was written with a leading forward slash (e.g. `/assets/foo.png`), which breaks on the `/narratix-lab/` subpath.
- **Resolution**: Always use relative paths (`./assets/foo.png` or `assets/foo.png`).

### Issue 3: Production Next.js Build Failing
- **Cause**: Someone mistakenly added `output: 'export'` to `next.config.mjs` attempting to make GitHub Pages host Next.js.
- **Resolution**: **Never** add `output: 'export'` to `next.config.mjs`. The Next.js application is strictly hosted on Vercel. Keep `website/` completely separate from Next.js.
