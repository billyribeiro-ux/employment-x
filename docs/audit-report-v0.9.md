# EMPLOYMENTX FORENSIC AUDIT REPORT — v0.9.0

**Audit Date:** 2026-02-09
**Auditor:** Cascade (ICT-7 mode)
**Baseline Tag:** v0.9.0-interview-room-v2
**Build:** 4/4 green | **Tests:** 88/88 passing | **E2E:** 1 skeleton (not wired)

---

## SECTION 1 — EXECUTIVE SCORECARD

| Metric | Value |
|---|---|
| **Features in registry** | 240 (F-001..F-240) |
| **IMPLEMENTED (partial or full)** | ~48 features (~20%) |
| **VERIFIED (strict rubric)** | 0 features (0%) |
| **NOT_STARTED** | ~192 features (~80%) |
| **Critical blockers (P0 gaps)** | 14 |
| **Launch readiness** | **NO-GO** |

### Why 0 VERIFIED

Per the strict rubric, VERIFIED requires: implementation + tests + e2e + tenant/RBAC checks + observability hooks. No feature currently meets all criteria. The closest are F-001/F-002/F-003 which have server actions + unit tests but lack e2e, full observability instrumentation, and route-level integration.

---

## SECTION 2 — FEATURE TRACEABILITY MATRIX (Implemented Features Only)

### Identity & Access (F-001..F-005)

| ID | Status | Backend | Frontend | DB | Tests | Evidence | Risk |
|---|---|---|---|---|---|---|---|
| F-001 | PARTIAL | auth/actions.ts, api/v1/auth/register | auth/register/page.tsx | User | auth-actions.test.ts (10) | Server action + unit tests, no e2e | Medium |
| F-002 | PARTIAL | auth/actions.ts, auth/next-auth.ts, api/v1/auth/login+logout | auth/login/page.tsx | Session | auth-actions.test.ts | Login/logout actions, no session lifecycle e2e | Medium |
| F-003 | PARTIAL | org/actions.ts | — | Organization, OrgMembership | org-actions.test.ts (10) | Create/add/remove member, no invite UI | Medium |
| F-004 | PARTIAL | auth/rbac.ts, lib/server/rbac.ts | — | OrgMembership | tenant-isolation.test.ts (19) | RBAC helpers exist, not wired to all routes | High |
| F-005 | NOT_STARTED | — | — | — | — | — | — |

### Candidate/Employer Profiles (F-006..F-010)

| ID | Status | Backend | Frontend | DB | Tests | Evidence | Risk |
|---|---|---|---|---|---|---|---|
| F-006 | PARTIAL | profiles/actions.ts, api/v1/candidates/profile | — | CandidateProfile | — | CRUD exists, no tests | Medium |
| F-010 | PARTIAL | api/v1/employers/profile | — | EmployerProfile | — | Route exists, no tests | Medium |

### Jobs (F-011..F-012)

| ID | Status | Backend | Frontend | DB | Tests | Evidence | Risk |
|---|---|---|---|---|---|---|---|
| F-011 | PARTIAL | jobs/actions.ts, api/v1/jobs | — | Job | — | Create/publish/list, no tests | Medium |
| F-012 | PARTIAL | jobs/actions.ts (listJobs) | — | Job | — | Filter/search/paginate, no tests | Low |

### Applications (F-013..F-015)

| ID | Status | Backend | Frontend | DB | Tests | Evidence | Risk |
|---|---|---|---|---|---|---|---|
| F-013 | PARTIAL | applications/actions.ts, api/v1/jobs/[id]/apply | — | Application | — | Apply + duplicate prevention, no tests | Medium |
| F-014 | PARTIAL | applications/actions.ts, api/v1/applications/[id]/stage | — | ApplicationStageEvent | — | Stage transitions + validation, no tests | High |
| F-015 | PARTIAL | api/v1/applications/[id]/scorecards | — | Scorecard | — | Route exists, no tests | Medium |

### Messaging (F-016..F-017)

| ID | Status | Backend | Frontend | DB | Tests | Evidence | Risk |
|---|---|---|---|---|---|---|---|
| F-016 | PARTIAL | chat/actions.ts, api/v1/conversations | — | Conversation, ConversationParticipant | — | Create + dedupe, no tests | High |
| F-017 | PARTIAL | chat/actions.ts, api/v1/conversations/[id]/messages | — | Message | — | Send/read/list, no tests | High |

### Scheduling (F-019..F-023, F-052..F-053)

| ID | Status | Backend | Frontend | DB | Tests | Evidence | Risk |
|---|---|---|---|---|---|---|---|
| F-019 | PARTIAL | meetings/actions.ts, api/v1/meetings | — | Meeting, MeetingParticipant | — | Create + conflict detection, no tests | High |
| F-020 | PARTIAL | meetings/actions.ts, api/v1/meetings/[id]/respond | — | MeetingEvent | — | Accept flow, no tests | High |
| F-021 | PARTIAL | meetings/actions.ts | — | MeetingEvent | — | Deny flow, no tests | Medium |
| F-022 | PARTIAL | meetings/actions.ts, api/v1/meetings/[id]/reschedule | — | MeetingEvent | — | Reschedule + lineage, no tests | High |
| F-052 | PARTIAL | meetings/actions.ts (detectConflict) | — | Meeting | — | Conflict detection, no tests | Medium |
| F-053 | PARTIAL | meetings/actions.ts (cancelMeeting) | — | MeetingEvent | — | Cancel flow, no tests | Medium |

### Video Interview (F-024..F-026)

| ID | Status | Backend | Frontend | DB | Tests | Evidence | Risk |
|---|---|---|---|---|---|---|---|
| F-024 | PARTIAL | video/livekit.ts, services/video-token.service.ts, services/video-webhook.service.ts | InterviewRoom.tsx, ParticipantTiles.tsx, hooks/* | VideoSession, MeetingEvent | video-validation.test.ts (26), video-provider-adapter.test.ts (7) | LiveKit wired, token + webhook, no e2e | Medium |
| F-025 | PARTIAL | services/video-webhook.service.ts | — | MeetingEvent | — | Webhook events tracked, no session diagnostics | Medium |

### Infrastructure (F-030..F-032, F-038..F-040, F-142..F-143)

| ID | Status | Backend | Frontend | DB | Tests | Evidence | Risk |
|---|---|---|---|---|---|---|---|
| F-030 | PARTIAL | middleware/idempotency.ts | — | IdempotencyKey | — | Middleware exists, not wired to all routes | High |
| F-031 | PARTIAL | lib/server/audit.ts | — | AuditEvent | — | writeAuditEvent used in all actions | Medium |
| F-032 | PARTIAL | lib/server/rate-limit.ts | — | — | rate-limit.test.ts (5) | Rate limiter exists + tests, not wired to all routes | Medium |
| F-038 | PARTIAL | lib/server/tracing.ts, observability/tracing.ts | — | — | — | OTel tracer + withSpan, not instrumented on routes | Medium |
| F-039 | PARTIAL | lib/server/sentry.ts | — | — | — | Sentry file exists, depth unknown | Medium |
| F-142 | IMPLEMENTED_UNVERIFIED | lib/server/errors.ts | — | — | — | AppError + errorResponse + handleRouteError, typed envelope | Low |
| F-143 | IMPLEMENTED_UNVERIFIED | lib/server/correlation.ts | — | — | — | getCorrelationId + withCorrelationHeaders | Low |
| F-202 | PARTIAL | lib/server/pii.ts | — | — | pii-redaction.test.ts (11) | PII redaction + tests | Low |

### Demo (F-036..F-037)

| ID | Status | Backend | Frontend | DB | Tests | Evidence | Risk |
|---|---|---|---|---|---|---|---|
| F-036 | PARTIAL | demo/lifecycle.ts, demo/sandbox.ts, api/v1/demo/scenarios | demo/page.tsx | DemoSession | — | Demo entry + scenarios, no tests | Medium |
| F-037 | PARTIAL | demo/sandbox.ts | — | DemoSession | — | Reset logic exists, no tests | Medium |

### Other Partial

| ID | Status | Notes |
|---|---|---|
| F-034 | PARTIAL | command-palette-wrapper.tsx exists, no backend |
| F-041 | PARTIAL | focus-trap.tsx exists |
| F-051 | PARTIAL | getUserAvailability in meetings/actions.ts |
| F-084 | PARTIAL | getCandidateStatusCenter in applications/actions.ts |
| F-109 | PARTIAL | focus-trap.tsx component |
| F-151 | PARTIAL | requestPasswordReset + confirmPasswordReset in auth/actions.ts |
| F-162 | PARTIAL | closeExpiredJobs + computeFreshnessScore in jobs/actions.ts |
| F-164 | PARTIAL | withdrawApplication in applications/actions.ts |
| F-210 | PARTIAL | data-states.tsx component |

---

## SECTION 3 — GAP CLASSIFICATION

### G1: Missing Implementation (~192 features)
All F-005, F-007..F-009, F-018, F-023, F-026..F-029, F-033, F-035, F-040..F-050, F-054..F-100, F-101..F-240 (excluding partials listed above).

### G2: Partial Implementation (~48 features)
All features listed in Section 2. Key gaps:
- **No route-level integration tests** for any API route
- **No e2e tests** for any user flow (skeleton only)
- **Observability not instrumented** on any route handler
- **Rate limiting not wired** to route handlers
- **Idempotency not wired** to critical write routes
- **RBAC not enforced** on most routes (helpers exist but not called)

### G3: Missing Tests
- 0 integration tests for API routes
- 0 e2e tests (1 skeleton, not runnable)
- No tests for: jobs, applications, chat, meetings, profiles, demo, billing
- No tests for: video webhook, video token route, interview-room route

### G4: Security/Tenancy Defects
- **Tenant isolation tests exist** (19 tests) but test helpers only, not actual route handlers
- **RBAC helpers exist** but not enforced in most API routes
- **No CSRF protection** verified
- **No webhook signature verification tests**

### G5: Reliability/Observability Defects
- **Tracing exists** (withSpan) but not called in any route handler
- **Logger exists** but structured logging inconsistent
- **No health check depth** (api/v1/health exists but unchecked)
- **Queue workers exist** (3) but no retry/DLQ policy
- **No CI pipeline** configured

### G6: UX/A11y Defects
- **focus-trap.tsx** exists but not verified
- **data-states.tsx** exists but not verified
- **No keyboard navigation tests**
- **No reduced-motion compliance**
- **Only 7 pages** — most features have no UI

### G7: Performance Defects
- **No pagination standardization** (offset-based, not cursor)
- **No code splitting verification**
- **No Web Vitals collection**

---

## SECTION 4 — TOP CRITICAL DEFECTS (P0)

| # | Defect | Impact | Fix Scope |
|---|---|---|---|
| 1 | **No integration tests for any API route** | Cannot verify route behavior | Add route-level tests for auth, jobs, applications, meetings, chat |
| 2 | **RBAC not enforced on API routes** | Any authenticated user can access any tenant's data | Wire authenticateRequest + tenant check to all routes |
| 3 | **No observability on route handlers** | Cannot trace production issues | Add withSpan to critical routes |
| 4 | **Rate limiting not wired** | Abuse-prone endpoints unprotected | Wire rate limiter to auth, token, chat routes |
| 5 | **Idempotency not wired to critical writes** | Duplicate submissions possible | Wire to meeting respond, reschedule, apply, stage transition |
| 6 | **No CI pipeline** | No merge gates | Create GitHub Actions workflow |
| 7 | **Queue workers have no retry/DLQ** | Silent failures | Add retry policy to BullMQ workers |
| 8 | **No candidate/employer profile UI pages** | Core flows incomplete | Create profile pages |
| 9 | **No jobs listing/detail UI pages** | Core flows incomplete | Create job pages |
| 10 | **No application pipeline UI** | Core flows incomplete | Create pipeline board |
| 11 | **No messaging UI** | Core flows incomplete | Create chat UI |
| 12 | **No scheduling UI** | Core flows incomplete | Create meeting UI |
| 13 | **No billing implementation** | Revenue path blocked | Implement billing service + Stripe webhook |
| 14 | **No notification system** | Users not informed of events | Implement notification service + UI |

---

## SECTION 5 — DETERMINISTIC REMEDIATION PLAN

### Batch 1: Platform Hardening (P0 Infrastructure)
**Target:** F-038, F-040, F-142, F-143, F-032, F-030, F-202
- Wire `withSpan` + `getCorrelationId` to all API route handlers
- Wire rate limiter to auth + video-token + chat routes
- Wire idempotency middleware to critical write routes
- Create GitHub Actions CI workflow (typecheck + lint + test + build)
- Add integration tests for auth routes (register, login, reset-password)

### Batch 2: Core Backend Tests + RBAC Enforcement
**Target:** F-004, F-011..F-014, F-016..F-017, F-019..F-022
- Wire `authenticateRequest` + tenant verification to all v1 routes
- Add integration tests for jobs, applications, chat, meetings routes
- Add RBAC deny-path tests

### Batch 3: Core Frontend Pages
**Target:** F-006, F-010, F-011, F-012, F-013, F-014, F-016, F-017, F-019
- Create candidate profile page
- Create employer profile page
- Create jobs listing + detail pages
- Create application pipeline board
- Create messaging/chat UI
- Create meeting scheduler UI

---

## SECTION 6 — EVIDENCE INDEX

No features currently meet VERIFIED status. Evidence for PARTIAL features:

| Feature | DB Evidence | API Evidence | Tests Evidence |
|---|---|---|---|
| F-001 | User model | POST /v1/auth/register | auth-actions.test.ts |
| F-002 | Session model | POST /v1/auth/login, /logout | auth-actions.test.ts |
| F-003 | Organization, OrgMembership | — (server actions) | org-actions.test.ts |
| F-004 | OrgMembership | — (rbac.ts helpers) | tenant-isolation.test.ts |
| F-024 | VideoSession, MeetingEvent | POST /meetings/[id]/video-token, /video/webhook | video-validation.test.ts, video-provider-adapter.test.ts |
| F-032 | — | — (rate-limit.ts) | rate-limit.test.ts |
| F-142 | — | errors.ts (AppError) | — |
| F-143 | — | correlation.ts | — |
| F-202 | — | pii.ts | pii-redaction.test.ts |
