# EmploymentX — CI/CD Pipeline Specification

Version: 1.0.0
Date: 2026-02-09

---

## 1. Pipeline Overview

```
Push/PR to main
  │
  ├─► Typecheck & Lint (TS)     ─┐
  ├─► Rust Check (fmt+clippy)   ─┤
  │                               ├─► Unit Tests (TS)
  │                               ├─► Unit Tests (Rust)
  │                               ├─► Build (TS)
  │                               ├─► Migration Validation
  │                               │
  │                               └─► E2E Smoke Tests
  │
  └─► All Green? ─► Deploy (main only)
```

## 2. Job Definitions

### 2.1 Typecheck & Lint
```yaml
name: Typecheck & Lint
runs-on: ubuntu-latest
steps:
  - checkout
  - pnpm install --frozen-lockfile
  - pnpm turbo typecheck
  - pnpm turbo lint
```

### 2.2 Rust Check
```yaml
name: Rust Check
runs-on: ubuntu-latest
working-directory: apps/api-rust
steps:
  - checkout
  - rust-toolchain@stable (clippy, rustfmt)
  - rust-cache
  - cargo fmt --check
  - cargo clippy -- -D warnings
  - cargo test
```

### 2.3 Unit Tests (TypeScript)
```yaml
name: Unit Tests
runs-on: ubuntu-latest
needs: typecheck-lint
steps:
  - checkout
  - pnpm install --frozen-lockfile
  - pnpm turbo test
```

### 2.4 Build
```yaml
name: Build
runs-on: ubuntu-latest
needs: typecheck-lint
steps:
  - checkout
  - pnpm install --frozen-lockfile
  - pnpm turbo build
```

### 2.5 Migration Validation
```yaml
name: Migration Validation
runs-on: ubuntu-latest
services:
  postgres:
    image: postgres:16-alpine
    env: { POSTGRES_USER: test, POSTGRES_PASSWORD: test, POSTGRES_DB: test }
    ports: [5432:5432]
    options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
steps:
  - checkout
  - install sqlx-cli
  - sqlx migrate run (against test DB)
```

### 2.6 E2E Smoke Tests
```yaml
name: E2E Smoke
runs-on: ubuntu-latest
needs: [build, rust-check]
steps:
  - checkout
  - pnpm install --frozen-lockfile
  - playwright install --with-deps chromium
  - pnpm turbo test:e2e
```

## 3. Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

In-flight runs for the same branch are cancelled when a new push arrives.

## 4. Caching Strategy

| Cache | Key | Restore |
|-------|-----|---------|
| pnpm store | `pnpm-${{ hashFiles('pnpm-lock.yaml') }}` | Exact + prefix |
| Rust target | `rust-${{ hashFiles('Cargo.lock') }}` | Exact + prefix |
| Next.js build | `.next/cache` | Branch-scoped |
| Playwright browsers | `playwright-${{ hashFiles('package.json') }}` | Exact |

## 5. Release Discipline

- **No direct deploy** without all CI gates green
- **Versioned migrations** — each migration is a numbered SQL file
- **Rollback plan** — compensating migration prepared before deploy
- **Feature flags** — new features behind flags for progressive rollout
- **Canary deploys** (planned) — 5% traffic to new version, monitor SLOs

## 6. Environment Matrix

| Environment | Trigger | Database | Redis | Stripe |
|-------------|---------|----------|-------|--------|
| **CI** | Every push/PR | Ephemeral (service container) | Ephemeral | Mock |
| **Staging** | Merge to main | Managed (staging) | Managed (staging) | Test mode |
| **Production** | Manual promote | Managed (prod) | Managed (prod) | Live mode |

## 7. Secrets Management

| Secret | Scope | Storage |
|--------|-------|---------|
| `DATABASE_URL` | Per-environment | GitHub Secrets / Vault |
| `REDIS_URL` | Per-environment | GitHub Secrets / Vault |
| `JWT_SECRET` | Per-environment | GitHub Secrets / Vault |
| `STRIPE_SECRET_KEY` | Per-environment | GitHub Secrets / Vault |
| `STRIPE_WEBHOOK_SECRET` | Per-environment | GitHub Secrets / Vault |
| `SENTRY_DSN` | Per-environment | GitHub Secrets / Vault |

Never committed to source control. `.env.example` files document required variables.
