# EmploymentX — Architecture Specification

Version: 1.0.0
Date: 2026-02-09
Status: APPROVED

---

## 1. System Overview

EmploymentX is a multi-tenant, production-grade employment platform covering the complete hiring lifecycle:

```
Identity → Discovery → Outreach → Private Chat → Scheduling → Reminders →
Video Interview (PiP) → Evaluation → Decision → Subscription/Billing → Audit/Analytics
```

### 1.1 Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Reliability over novelty** | Battle-tested stack (Rust, PostgreSQL, React), no experimental dependencies |
| **Multi-tenant isolation** | Every business table scoped by `organization_id`, enforced in middleware |
| **Keyboard-first UX** | Command palette, sequence shortcuts, scope-aware bindings |
| **Observability from day 1** | OpenTelemetry traces, Sentry errors, structured JSON logs, audit trail |
| **Idempotency on writes** | SHA-256 fingerprinted idempotency keys on all critical mutations |
| **Accessibility mandatory** | WCAG AA contrast, visible focus rings, screen reader support, reduced-motion |

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CDN / Edge                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Next.js Frontend (App Router)                    │
│  React 19 · TypeScript strict · Tailwind · Radix · cmdk      │
│  Redux Toolkit · React Query · GSAP · Motion                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / JSON
┌──────────────────────────▼──────────────────────────────────┐
│                 Rust API (Axum + Tokio)                       │
│  Modules: identity, tenancy, candidate, employer, jobs,      │
│  applications, chat, scheduling, reminders, interview,       │
│  billing, entitlements, notifications, search, shortcuts,    │
│  audit, security, observability, demo                        │
├──────────────────────────┬──────────────────────────────────┤
│  Middleware: auth (JWT+Argon2), tenant, request_id,          │
│  idempotency, rate_limit, demo_guard                         │
└──────┬───────────┬───────┴───────────┬──────────────────────┘
       │           │                   │
┌──────▼──┐  ┌─────▼─────┐  ┌─────────▼─────────┐
│ Postgres │  │   Redis   │  │  Background Jobs  │
│   16     │  │     7     │  │  (Tokio tasks)    │
│          │  │           │  │  Reminders, notif, │
│  System  │  │  Cache,   │  │  demo cleanup,    │
│  of      │  │  locks,   │  │  webhook retry    │
│  record  │  │  rate     │  │                   │
│          │  │  limits,  │  │                   │
│          │  │  idempot. │  │                   │
└──────────┘  └───────────┘  └───────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Route Structure

```
/                           Landing page (public)
/demo                       Demo role selection (public)
/auth/login                 Authentication
/auth/register              Registration
/dashboard                  Dashboard home (protected)
/dashboard/jobs             Job management
/dashboard/candidates       Candidate pipeline
/dashboard/messages         Private chat
/dashboard/scheduling       Meeting lifecycle
/dashboard/interviews       Video interview rooms
/dashboard/billing          Subscription management
/dashboard/settings         User/org settings
```

### 2.2 State Architecture

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Server state** | TanStack React Query | API data fetching, caching, optimistic updates |
| **Client state** | Redux Toolkit | Auth tokens, user session, shortcuts, command palette, UI preferences |
| **Form state** | react-hook-form + Zod | Form validation, field-level errors |
| **URL state** | Next.js App Router | Route params, search params, pagination |

### 2.3 Component Hierarchy

```
<Providers>                          (React Query + Redux)
  <RootLayout>                       (html, body, globals.css)
    <DemoBannerGuard>                (watermark for demo sessions)
      <DashboardLayout>              (sidebar + main)
        <DashboardNav />             (sidebar navigation)
        <main>{children}</main>      (page content)
        <CommandPaletteWrapper />    (⌘K command palette)
        <ShortcutHelpOverlay />      (? shortcut help)
      </DashboardLayout>
    </DemoBannerGuard>
  </RootLayout>
</Providers>
```

### 2.4 Design Token System

Token-first approach using CSS custom properties mapped to Tailwind utilities:

- **4 theme modes**: light, dark, high-contrast light, high-contrast dark
- **Color categories**: background (3 levels), surface, foreground (3 levels), brand (primary/secondary/violet), semantic (success/warning/destructive/info), chart (5 colors), demo banner
- **Motion tokens**: 7 duration levels, 7 easing curves, 6 delay values
- **Focus**: `--focus-ring` token, visible on all interactive elements via `:focus-visible`

### 2.5 Animation System

| Owner | Scope | Examples |
|-------|-------|---------|
| **GSAP** | Cinematic, timelines, scroll | Hero entrance, scroll reveals, counter animations, parallax |
| **Motion** | Component lifecycle, micro | Fade in/out, slide up/down, scale, hover lift, press scale, popover, toast |

Rule: No same-element same-property conflicts. All durations from centralized tokens. Reduced-motion zeroes all animations.

---

## 3. Backend Architecture

### 3.1 Module Boundaries

Each module owns its routes, handlers, types, and queries. Cross-module communication via shared `AppState`.

| Module | Responsibility |
|--------|---------------|
| `auth` | Registration, login, logout, JWT, password hashing |
| `candidates` | Candidate profiles, documents, skills, search |
| `employers` | Company profiles, employer management |
| `jobs` | Job posts, publishing, versioning |
| `applications` | Apply, stage transitions, scorecards, decisions |
| `chat` | Conversations, messages, receipts, attachments |
| `scheduling` | Meeting requests, accept/deny/reschedule, availability |
| `interviews` | Video rooms, tokens, sessions, PiP state, feedback |
| `billing` | Plans, subscriptions, usage metering, Stripe webhooks |
| `shortcuts` | Shortcut profiles, bindings, usage telemetry |
| `flags` | Feature flags (OpenFeature-compatible) |
| `demo` | Demo sessions, seed data, reset engine, analytics |

### 3.2 Middleware Stack

```
Request → inject_request_id → CORS → Compression → Timeout → Tracing
       → require_auth (protected routes) → tenant_context → idempotency
       → Handler → Response
```

### 3.3 Error Model

Standardized JSON error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "request_id": "req_abc123",
    "details": {}
  }
}
```

Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

---

## 4. Database Architecture

### 4.1 Schema Strategy

- **60+ tables** across 12 domains
- **Tenant isolation**: `organization_id` on all business tables with composite indexes
- **Versioned entities**: `version` column for optimistic concurrency
- **Audit trail**: `audit_events` table capturing all mutations
- **Idempotency store**: `idempotency_keys` with TTL-based cleanup
- **Demo isolation**: Separate `demo_sessions`, `demo_resets`, `demo_seed_versions`, `demo_action_events` tables

### 4.2 Index Strategy

- Primary keys: UUID v7 (time-ordered)
- Foreign keys: All indexed
- Query patterns: Composite indexes on `(organization_id, created_at)` for tenant-scoped listing
- Partial indexes: `WHERE is_active = true`, `WHERE status = 'published'`
- Full-text: `tsvector` columns on searchable fields (jobs, candidates)

### 4.3 Migration Discipline

- Versioned SQL files in `infra/migrations/`
- Forward-only (no down migrations in production)
- CI validates migrations against test database
- Rollback via compensating migrations

---

## 5. Security Architecture

### 5.1 Authentication

- JWT access tokens (1 hour TTL)
- Refresh tokens (7 day TTL)
- Argon2id password hashing
- MFA support (TOTP, prepared)

### 5.2 Authorization

- Role-based: `admin`, `owner`, `manager`, `recruiter`, `interviewer`, `viewer`, `candidate`
- Tenant-scoped: All queries filtered by `organization_id` from JWT claims
- Resource-level: Ownership checks on sensitive operations

### 5.3 Demo Security

- Sandbox tenant segregation (demo orgs cannot access real data)
- Rate limits on demo endpoints
- No outbound email/SMS/webhooks from demo sessions
- Synthetic video tokens only
- Auto-expiry after 2 hours

---

## 6. Observability Architecture

### 6.1 Tracing

- OpenTelemetry SDK with OTLP exporter
- Distributed trace context propagation
- Span attributes: `tenant_id`, `user_id`, `request_id`

### 6.2 Logging

- Structured JSON via `tracing` crate
- Log levels: ERROR, WARN, INFO, DEBUG, TRACE
- Correlation via `request_id` header

### 6.3 Error Tracking

- Sentry integration with environment filtering
- Breadcrumbs for request lifecycle
- User context attachment

### 6.4 Metrics (Planned)

- Request latency histograms
- Error rate counters
- Active demo session gauge
- Queue depth for background jobs

---

## 7. CI/CD Architecture

### 7.1 Pipeline Gates

```
typecheck → lint → unit tests → build → Rust check → migration validation → e2e smoke
```

All gates must pass. No direct deploy without green pipeline.

### 7.2 Release Discipline

- Semantic versioning
- Versioned migrations with rollback plans
- Feature flags for progressive rollout
- Canary deployments (planned)

---

## 8. Deployment Topology (Target)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Vercel /    │     │  Container   │     │  Managed    │
│  CDN Edge    │────▶│  Cluster     │────▶│  Services   │
│  (Frontend)  │     │  (API)       │     │  (DB/Redis) │
└─────────────┘     └─────────────┘     └─────────────┘
```

- Frontend: Vercel (Next.js optimized)
- API: Container orchestration (ECS/Fly.io/Railway)
- Database: Managed PostgreSQL (RDS/Neon/Supabase)
- Cache: Managed Redis (ElastiCache/Upstash)
