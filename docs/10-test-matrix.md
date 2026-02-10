# EmploymentX — Test Matrix (Mapped to Feature IDs)

Version: 1.0.0
Date: 2026-02-09

---

## 1. Test Categories

| Category | Tool | Scope | CI Gate |
|----------|------|-------|---------|
| **Unit** | Vitest (TS), cargo test (Rust) | Domain logic, utilities, state machines | Yes |
| **Integration** | Vitest + MSW (TS), cargo test + testcontainers (Rust) | API flows, DB queries, tenant isolation | Yes |
| **E2E** | Playwright | Full user journeys, browser interactions | Yes (smoke) |
| **Security** | Custom + Playwright | Cross-tenant, unauthorized access, webhook spoofing | Yes |

## 2. Unit Tests

| Test Suite | Feature IDs | Description |
|-----------|-------------|-------------|
| `auth.unit` | 001, 002, 003 | Password hashing, JWT creation/validation, claim extraction |
| `candidates.unit` | 021, 022, 027, 028 | Profile CRUD, availability toggle, pagination |
| `employers.unit` | 041, 042, 043, 044 | Company CRUD, employer profile |
| `jobs.unit` | 051, 052, 053, 054 | Job post CRUD, status transitions |
| `applications.unit` | 071, 072, 073, 075, 079 | Apply, stage transitions, decisions, source tracking |
| `chat.unit` | 091, 092, 093, 094, 095, 096 | Conversation CRUD, message send, read receipts |
| `scheduling.unit` | 111, 112, 113, 114, 115, 116, 119, 121, 122, 134 | Meeting lifecycle, reminder creation/cancellation, timezone |
| `interviews.unit` | 136, 137, 138, 139 | Room creation, token generation, events, feedback |
| `billing.unit` | 156, 157, 158, 159 | Plans, subscriptions, usage metering |
| `shortcuts.unit` | 177, 178, 180, 182, 183 | Sequence engine, combo matching, conflict detection, telemetry |
| `keyboard-engine.unit` | 177, 178, 180, 182, 183 | KeyboardEngine class methods |
| `idempotency.unit` | — | Fingerprint computation, cache hit/miss/conflict logic |
| `demo.unit` | 192, 193, 198, 208 | Session creation, seed data, action tracking, flags |
| `motion-tokens.unit` | — | Duration/easing lookups, reduced-motion, withReducedMotion |
| `redux-slices.unit` | — | Auth slice reducers, shortcuts slice reducers |

## 3. Integration Tests

| Test Suite | Feature IDs | Description |
|-----------|-------------|-------------|
| `tenant-isolation.int` | 012 | Verify org A cannot read org B data across all endpoints |
| `rbac-enforcement.int` | 011 | Verify role-based access on all protected endpoints |
| `meeting-lifecycle.int` | 111–114, 119, 121 | Full accept/deny/reschedule flow with reminders |
| `chat-delivery.int` | 091, 092, 095, 097 | Send message → delivery receipt → read receipt |
| `reminder-jobs.int` | 119, 120, 121 | Reminder creation, delivery, cancellation |
| `billing-webhooks.int` | 160, 173 | Stripe webhook signature verification, idempotent processing |
| `demo-constraints.int` | 192, 193, 194, 200, 209 | Demo session lifecycle, reset, rate limits, isolation |
| `idempotency.int` | — | End-to-end idempotency on meeting accept, application stage |
| `application-pipeline.int` | 071, 072, 075 | Apply → screen → interview → decide flow |
| `auth-flow.int` | 001, 002, 004 | Register → login → refresh → logout |

## 4. E2E Tests (Playwright)

| Test Suite | Feature IDs | Description |
|-----------|-------------|-------------|
| `demo-entry.e2e` | 191, 192, 197 | Landing → Try Demo → role select → dashboard (no signup) |
| `demo-candidate.e2e` | 205 | Browse jobs, apply, view application status |
| `demo-employer.e2e` | 206 | Post job, review candidates, schedule interview |
| `message-schedule.e2e` | 091, 092, 111, 112, 113, 114 | Send message → schedule meeting → accept → reschedule |
| `interview-launch.e2e` | 136, 140 | Create room → join → sandbox video UI |
| `command-palette.e2e` | 176, 177, 179 | ⌘K open → search → navigate; ? overlay; G+C sequence |
| `subscription-sandbox.e2e` | 156, 165, 166 | View plans → select → sandbox checkout |
| `keyboard-shortcuts.e2e` | 177, 178, 133 | Sequence nav, combo shortcuts, meeting accept/deny |
| `accessibility.e2e` | — | Focus management, screen reader, contrast, reduced motion |

## 5. Security Tests

| Test Suite | Feature IDs | Description |
|-----------|-------------|-------------|
| `cross-tenant.sec` | 012 | Attempt to read/write resources from another org |
| `unauthorized-mutation.sec` | 011 | Attempt mutations without auth or with wrong role |
| `webhook-spoof.sec` | 160 | Send webhook without valid Stripe signature |
| `rate-limit-abuse.sec` | 018, 200, 210 | Exceed rate limits on auth and demo endpoints |
| `demo-escape.sec` | 209 | Attempt to access real data from demo session |
| `jwt-tampering.sec` | 002 | Modified JWT payload, expired tokens, wrong secret |

## 6. Coverage Targets

| Category | Target | Measurement |
|----------|--------|-------------|
| Unit (Rust) | 80% line coverage | `cargo tarpaulin` |
| Unit (TypeScript) | 80% line coverage | Vitest coverage |
| Integration | All critical paths | Feature ID traceability |
| E2E | All user journeys | Playwright test count |
| Security | All threat vectors | Threat model coverage |

## 7. CI Integration

```yaml
# Parallel test execution in CI
jobs:
  unit-ts:     pnpm turbo test
  unit-rust:   cargo test
  integration: cargo test --features integration
  e2e-smoke:   pnpm exec playwright test --grep @smoke
  security:    pnpm exec playwright test --grep @security
```

All must pass before merge to main.
