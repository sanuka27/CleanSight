# CleanSight — CI/CD Setup Guide

> **Branch**: `feature/ci-cd-github-actions`  
> **Related section**: CleanSight Improvement Plan § 1.2 — Continuous Integration & Deployment

---

## Overview

This document describes the GitHub Actions CI/CD pipeline added to CleanSight and the recommended branch protection rules to enforce it.

```
.github/
├── workflows/
│   ├── ci.yml               ← Main CI pipeline (runs on every PR)
│   └── pr-quality-gate.yml  ← Posts a pass/fail summary comment on PRs
├── CODEOWNERS               ← Auto-request reviews from code owners
└── pull_request_template.md ← Structured PR description template
```

---

## Workflows

### `ci.yml` — Main CI Pipeline

Triggers on every **Pull Request** targeting `main` or `develop`, and can be run manually via `workflow_dispatch`.

| Job | What it does | Depends on |
|-----|-------------|------------|
| `lint-typecheck` | Runs `eslint .` and `tsc --noEmit` in the Frontend | — |
| `test-frontend` | Runs Vitest (`vitest run --coverage`), uploads coverage artifact | `lint-typecheck` |
| `test-backend` | Runs Node built-in test runner across all 4 backend test files | — |
| `docker-build` | Builds Frontend (builder stage), Backend (production stage), ML (base stage) | — |

**Key design decisions:**

- `test-frontend` is gated behind `lint-typecheck` to avoid wasting runner minutes on tests that would fail for style/type reasons.
- `test-backend` and `docker-build` run **in parallel** with `lint-typecheck` to minimise total wall time.
- Docker images are built but **never pushed** — this is a build-correctness gate only.
- The ML "base" stage is built instead of "production" to validate dependency resolution without downloading TensorFlow/PyTorch weights (~1 GB).
- All Docker builds use **GitHub Actions GHA cache** (`type=gha`) for layer reuse across runs — dramatically speeds up subsequent PR pushes.
- Firebase config vars are **stubbed** in CI using harmless placeholder values so unit tests don't throw "No Firebase App has been created" errors at import time.

### `pr-quality-gate.yml` — PR Summary Comment

Runs after `ci.yml` completes. Posts (or replaces) a status table comment directly on the PR, showing which jobs passed or failed and linking to the coverage artifact.

---

## Required Branch Protection Rules

To enforce these checks, configure the following in **GitHub → Repository Settings → Branches → Branch protection rules** for the `main` branch:

| Setting | Value |
|---------|-------|
| **Require status checks to pass before merging** | ✅ Enabled |
| Required status checks | `Frontend · Lint & Type-check` |
| | `Frontend · Vitest Unit Tests` |
| | `Backend · Node Test Runner` |
| | `Docker · Build All Images` |
| **Require branches to be up to date before merging** | ✅ Enabled |
| **Require a pull request before merging** | ✅ Enabled |
| **Require review from Code Owners** | ✅ Enabled (uses `CODEOWNERS`) |
| **Do not allow bypassing the above settings** | ✅ Recommended for production |

> **Note**: Status check names must match the `name:` field of each job in `ci.yml` exactly. GitHub registers them after the first successful run.

---

## Secrets & Variables

The CI pipeline requires **no secrets** to run its checks. Stub values are used for Firebase config in the test environment.

If you later add Docker Hub image publishing, add these repo secrets:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (not your password) |

---

## Local Equivalents

Run the same checks that CI runs, locally:

```bash
# From the repo root

# 1. Lint (ESLint)
cd Frontend && pnpm run lint

# 2. Type-check
cd Frontend && pnpm exec tsc --noEmit --project tsconfig.json

# 3. Frontend unit tests
cd Frontend && pnpm run test

# 4. Frontend tests with coverage
cd Frontend && pnpm exec vitest run --coverage

# 5. Backend unit tests
cd Backend && node --test \
  src/tests/roleGuard.test.js \
  src/tests/reportStatus.test.js \
  src/tests/badgeService.test.js \
  src/tests/volunteerProgress.test.js

# 6. Docker builds
docker build -f Frontend/Dockerfile --target builder .
docker build -f Backend/Dockerfile --target production .
docker build -f ML/Dockerfile --target base .
```

---

## Adding New Tests

### Frontend (Vitest)
Place test files anywhere under `Frontend/src/` with the extension `.test.ts` or `.test.tsx`. They are automatically picked up by the glob pattern `src/**/*.{test,spec}.{ts,tsx}` in `vitest.config.ts`.

### Backend (node:test)
Place test files in `Backend/src/tests/`. Add them to the `node --test` command in both:
- `Backend/package.json` → `"test"` script
- `.github/workflows/ci.yml` → `test-backend` job `run` step
