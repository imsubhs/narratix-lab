# Contributing to Narratix Lab

Thank you for your interest in contributing to Narratix Lab.

This document outlines the engineering guidelines, branching rules, and verification standards required for all contributions.

---

## 1. Core Architectural Constraints

Before proposing any changes, understand the repository deployment boundaries:

* **Production Application (Target A)**: Deployed to **Vercel** with full Next.js App Router server runtime, Supabase SSR, Stripe, and AI provider waterfalls.
  * **RULE**: Never add `output: 'export'` to `next.config.mjs`.
  * **RULE**: Never strip API routes or server actions to satisfy static hosting.
  * **RULE**: Never commit secrets or modify `.env.example` with sensitive data.
* **Public Showcase & Documentation (Target B)**: Deployed to **GitHub Pages** from the `website/` directory.
  * **RULE**: The public site must remain pure static HTML/CSS/JS with zero server dependencies.
  * **RULE**: All asset paths in `website/` must be base-path safe (`./` relative) for the `/narratix-lab/` subpath.

---

## 2. Branching & Commit Workflow

* The default development and production branch is `main`.
* Create a dedicated feature or bugfix branch for your work:
  ```bash
  git checkout -b feat/your-feature-name
  # or
  git checkout -b fix/your-bugfix-name
  ```
* Write concise, conventional commit messages:
  * `feat: ...` for new features
  * `fix: ...` for bug fixes
  * `docs: ...` for documentation
  * `ci: ...` for workflow changes
  * `chore: ...` for maintenance

---

## 3. Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/imsubhs/narratix-lab.git
   cd narratix-lab
   ```

2. **Install exact dependencies:**
   ```bash
   npm ci
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   *(Note: Set `DEMO_MODE=true` to test the full analysis pipeline at zero API cost).*

4. **Launch development server:**
   ```bash
   npm run dev
   ```

---

## 4. Verification & Testing Checklist

Every pull request must pass the automated verification suite before merging:

```bash
# 1. Type validation
npx tsc --noEmit

# 2. Next.js ESLint
npm run lint

# 3. Offline Demo Mode Regression Tests (Stage 7A)
npm run test:demo

# 4. Offline Export System Tests (Stage 8B)
npm run test:export

# 5. Production Next.js Build
npm run build
```

---

## 5. Visual Standards (Modern Dark)

* Follow the established **Modern Dark** token scale:
  * Background: `var(--nl-bg)` (`#0B0B0C`)
  * Surface: `var(--nl-panel)` (`#141416`)
  * Elevated: `var(--nl-panel-soft)` (`#1A1A1D`)
  * Primary: `var(--nl-primary)` (`#7C3AED`)
* Typography: Use `Plus Jakarta Sans` for UI text and `JetBrains Mono` for code/telemetry.
* Avoid generic startup gradients, neon overload, or excessive glassmorphism.
