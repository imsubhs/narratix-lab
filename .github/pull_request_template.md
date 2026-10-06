## Description

<!-- Provide a concise description of the change, motivation, and context. -->

## Target Area

- [ ] Production SaaS Application (Vercel runtime)
- [ ] Public Static Site (`website/` directory for GitHub Pages)
- [ ] Technical Documentation (`docs/` or `README.md`)
- [ ] CI/CD Workflows (`.github/workflows/`)
- [ ] Test Harness or Export Engines

## Checklist

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run lint` passes with 0 warnings/errors
- [ ] `npm run test:demo` passes (43/43 tests)
- [ ] `npm run test:export` passes (67/67 tests)
- [ ] `npm run build` succeeds locally
- [ ] No secrets or private credentials added to repository files
- [ ] Public static site asset paths remain base-path compatible (`./`)
