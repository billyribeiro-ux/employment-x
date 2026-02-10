# EmploymentX

Production-grade employment platform — scalable, multi-tenant, engineered for a 10-year horizon.

## Architecture

```
employmentx/
├── apps/
│   ├── web/              # Next.js 15 (App Router) + React 19 + TypeScript (strict)
│   └── api-rust/         # Rust Axum + Tokio modular monolith
├── packages/
│   ├── config/           # Shared ESLint, Prettier, TypeScript configs
│   ├── contracts/        # Zod schemas — single source of truth for API shapes
│   ├── sdk/              # TypeScript API client consumed by frontend
│   └── ui/               # Shared React component library (Radix + Tailwind + CVA)
├── infra/
│   ├── docker/           # docker-compose (Postgres 16, Redis 7), Dockerfiles
│   └── migrations/       # SQLx versioned migrations (production-ready DDL)
└── .github/workflows/    # CI pipeline (typecheck, lint, test, build, Rust check, migration validation)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript (strict), Tailwind CSS, Radix UI, cmdk, GSAP + Motion |
| **State** | Redux Toolkit, TanStack React Query |
| **Backend** | Rust, Axum, Tokio, SQLx |
| **Database** | PostgreSQL 16 (system of record), Redis 7 (cache, locks, rate limits) |
| **Auth** | JWT + Argon2, RBAC, tenant isolation |
| **Billing** | Stripe (subscriptions, usage metering) |
| **Observability** | OpenTelemetry, Sentry, structured JSON logging |
| **CI/CD** | GitHub Actions (typecheck → lint → test → build → e2e) |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust 1.75+ (for API)
- Docker & Docker Compose

### Setup

```bash
# 1. Install JS dependencies
pnpm install

# 2. Start infrastructure
docker compose -f infra/docker/docker-compose.yml up -d

# 3. Copy env files
cp apps/api-rust/.env.example apps/api-rust/.env

# 4. Run database migrations (requires sqlx-cli)
cd apps/api-rust && cargo sqlx migrate run

# 5. Start the API
cd apps/api-rust && cargo run

# 6. Start the frontend (in another terminal)
pnpm --filter @employmentx/web dev
```

### Development Commands

```bash
pnpm turbo build        # Build all packages
pnpm turbo typecheck    # Type-check all packages
pnpm turbo lint         # Lint all packages
pnpm turbo test         # Run unit tests
pnpm turbo dev          # Start dev servers
```

## Database Schema

Production-ready, tenant-scoped PostgreSQL schema with:

- **50+ tables** covering identity, candidates, employers, jobs, applications, chat, scheduling, interviews, billing, shortcuts, audit
- **Comprehensive indexing** on all foreign keys and query patterns
- **Tenant isolation** via `organization_id` on all business tables
- **Versioned entities** with optimistic concurrency (`version` column)
- **Audit trail** via `audit_events` table
- **Idempotency store** for critical write operations

## API Surface

RESTful API with consistent patterns:

- `POST /v1/auth/register` — User registration
- `POST /v1/auth/login` — Authentication
- `GET /v1/me` — Current user profile
- `GET/POST /v1/candidates` — Candidate CRUD
- `GET/POST /v1/companies` — Company CRUD
- `GET/POST /v1/jobs` — Job post CRUD
- `POST /v1/jobs/:id/apply` — Apply to job
- `POST /v1/applications/:id/stage` — Stage transitions
- `POST /v1/applications/:id/decision` — Hire/reject decisions
- `GET/POST /v1/conversations` — Chat conversations
- `POST /v1/meetings/request` — Schedule meetings
- `POST /v1/interviews/rooms` — Video room management
- `GET /v1/billing/plans` — Subscription plans
- `GET/PATCH /v1/shortcuts` — Keyboard shortcut profiles
- `GET /v1/flags` — Feature flags

All protected routes require `Authorization: Bearer <token>`. Tenant isolation enforced via middleware.

## Keyboard-First UX

- **Command Palette** (`⌘K`) — Navigate anywhere, execute actions
- **Sequence shortcuts** — `g c` (candidates), `g j` (jobs), `g m` (messages)
- **Customizable bindings** — Per-user shortcut profiles stored server-side
- **Conflict detection** — Prevents duplicate key bindings

## CI Pipeline Gates

1. **Typecheck** — All packages must pass strict TypeScript
2. **Lint** — ESLint + Prettier enforcement
3. **Unit Tests** — Vitest
4. **Build** — All packages must build successfully
5. **Rust Check** — `cargo fmt`, `cargo clippy`, `cargo test`
6. **Migration Validation** — Migrations run against test database
7. **E2E Smoke** — Playwright tests

Pipeline fails if any gate fails. No direct main deploy without green pipeline.

## License

Proprietary — All rights reserved.
