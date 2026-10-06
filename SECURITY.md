# Security Policy — Narratix Lab

## Supported Versions

Only the current `main` branch deployed to production is actively monitored for security vulnerabilities.

| Target | Platform | Supported |
| :--- | :--- | :--- |
| Production SaaS | Vercel (`narratix-lab.vercel.app`) | :white_check_mark: |
| Public Static Portal | GitHub Pages (`imsubhs.github.io/narratix-lab`) | :white_check_mark: |
| Legacy / Archive Branches | Self-hosted / Archived | :x: |

---

## Architectural Security Boundary

Narratix Lab enforces a strict dual-target architectural boundary:

1. **Target A — Production SaaS (Vercel)**
   - All private environment variables (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, etc.) are securely stored in Vercel Project Settings.
   - Server Actions and API routes enforce server-side validation, CSP headers, rate-limiting, and sanitized telemetry.
   - Error messages strip any detected API keys (`sk-*`) before serializing to logs or responses.

2. **Target B — Public Static Site (GitHub Pages)**
   - The public documentation site in `website/` is 100% static HTML/CSS/JS.
   - It contains **zero secrets**, **zero API tokens**, and has no database or server dependencies.
   - Deployment via GitHub Actions uploads only the `website/` folder artifact.

---

## Reporting a Vulnerability

If you discover a security vulnerability or potential secret leak within this repository, **do not open a public GitHub issue**.

Please report vulnerabilities privately:
- **Email**: Send a detailed advisory to the repository maintainer (`imsubhs`).
- **Required Details**:
  - Description of the vulnerability.
  - Clear steps to reproduce or Proof of Concept (PoC).
  - Potential impact and severity assessment.
  - Affected components or routes.

We will acknowledge receipt within 48 hours and work with you to patch the issue before public disclosure.
