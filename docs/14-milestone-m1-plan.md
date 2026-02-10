# Milestone M1 — Production Foundation

## Objective

Ship a real, demo-capable, secure MVP that proves the full hiring loop:

**Auth → Candidate Profile → Jobs → Apply → Chat → Meeting Request/Accept/Reschedule → Reminders → Interview Room Launch (sandbox) → Decision → Basic Billing (plans/subscriptions sandbox) → Observability + CI gates**

This is the minimum slice that can be used by real users and showcased in portfolio/demo mode without fake UX shells.

---

## Scope Cut

### In Scope (M1)

- All P0 features
- Selected P1 features required for production safety/usability

### Out of Scope (M2+)

- Most P2/P3 enhancements (advanced analytics depth, enterprise SSO/SCIM, heavy agency intelligence, transcript/AI extras, simulation extras)

---

## P0/P1 Features Included in M1

### Sprint S1 — Platform + Security + Core Identity

**Goal:** Platform boots correctly, safely, with CI and tenant/RBAC foundations.

#### P0

| Feature ID | Feature Name |
|------------|-------------|
| F-001 | User registration |
| F-002 | Login/logout |
| F-004 | RBAC enforcement |
| F-031 | Audit event ledger |
| F-032 | Rate limiting/abuse controls |
| F-038 | OTel traces/correlation baseline |
| F-039 | Sentry monitoring |
| F-040 | CI quality gates |
| F-049 | Zero-downtime migration discipline |
| F-093 | Stripe webhook signature verification |
| F-099 | SLO dashboard baseline |
| F-109 | Dialog focus trap |
| F-110 | ARIA/form labeling |
| F-142 | Standard error envelope |
| F-143 | Correlation ID propagation |
| F-144 | Pagination/sort standards |
| F-146 | Migration lint guardrails |
| F-151 | Password reset |
| F-155 | Tenant-safe query helpers |
| F-156 | Cross-tenant access test harness |
| F-200 | CSRF/XSS hardening gates |
| F-202 | PII redaction in logs/traces |
| F-206 | Theme token compliance |
| F-210 | Empty/loading/error state consistency |
| F-225 | Demo TTL cleanup |

#### P1 (critical foundation)

| Feature ID | Feature Name |
|------------|-------------|
| F-003 | Organization + membership |
| F-141 | Contract versioning policy |
| F-148 | Redis key namespace/TTL policy |
| F-150 | Ops runbooks |

---

### Sprint S2 — Profiles, Jobs, Demo Entry, Keyboard, A11y/UX Baseline

**Goal:** Users can onboard and explore; demo can enter without signup.

#### P0

| Feature ID | Feature Name |
|------------|-------------|
| F-006 | Candidate profile CRUD |
| F-011 | Job post create/edit/publish |
| F-012 | Job listing/search/filter |
| F-034 | Command palette |
| F-036 | Public demo entry |
| F-037 | Demo seeded data + reset |
| F-041 | WCAG baseline (skip links/keyboard nav) |
| F-103 | Demo action guardrails |
| F-115 | Pagination standards enforcement |
| F-140 | Typed frontend SDK generation |

#### P1

| Feature ID | Feature Name |
|------------|-------------|
| F-010 | Employer profile/company page |
| F-152 | Email verification resend/cooldown |
| F-159 | Candidate preference matrix |
| F-162 | Job freshness/expiry |
| F-205 | DR drill automation (stretch — move to S4 if overloaded) |
| F-207 | High-contrast mode |
| F-208 | Typography token system |
| F-216 | One-command local bootstrap |
| F-217 | FE SDK/API contract tests |
| F-224 | Demo-to-signup context handoff |

---

### Sprint S3 — Applications + Chat + Scheduling Core

**Goal:** First real end-to-end hiring pipeline works.

#### P0

| Feature ID | Feature Name |
|------------|-------------|
| F-013 | Apply to job |
| F-014 | Application stage transitions |
| F-016 | Private conversation creation |
| F-017 | Send/receive messages + receipts |
| F-019 | Meeting request creation |
| F-020 | Accept meeting |
| F-021 | Deny meeting |
| F-022 | Reschedule meeting |
| F-023 | Reminder engine |
| F-030 | Idempotency middleware |
| F-052 | Double-booking conflict detection |

> F-142/F-144 enforcement verified across new APIs (already in S1 but coverage check here).

#### P1

| Feature ID | Feature Name |
|------------|-------------|
| F-051 | Availability management |
| F-053 | Meeting cancellation |
| F-075 | SLA breach alerts for stalled candidates |
| F-082 | Hiring team assignment/permissions |
| F-084 | Candidate status transparency center |
| F-131 | Time-to-hire analytics baseline |
| F-172 | Buffer-time rules |
| F-173 | Timezone conflict warnings |
| F-185 | Notification dedupe |
| F-190 | Demo-to-signup conversion telemetry |

---

### Sprint S4 — Interview + Billing + Launch Hardening

**Goal:** Decision-capable interviews + paid plan skeleton + release readiness.

#### P0

| Feature ID | Feature Name |
|------------|-------------|
| F-024 | Video room create/token issuance (sandbox-capable) |
| F-027 | Plan catalog + entitlements |
| F-028 | Subscription lifecycle (sandbox first, prod-ready architecture) |
| F-050 | Queue retry + DLQ policy |
| F-240 | Go-live gate system |

#### P1

| Feature ID | Feature Name |
|------------|-------------|
| F-015 | Scorecards/interviewer feedback |
| F-042 | Notification center |
| F-043 | Email hook architecture (suppressed in demo) |
| F-048 | Feature flags |
| F-071 | Rubric templates |
| F-072 | Post-call action launcher |
| F-073 | Decision records with evidence |
| F-090 | Invoice history |
| F-099 | SLO operationalization completion |
| F-104 | Tenant-scoped flag rollout |
| F-105 | Safe fallback if flag provider fails |
| F-111 | Reduced-motion compliance |
| F-113 | Suspense/code split strategy |
| F-211 | Web vitals budgets |
| F-212 | Image optimization |
| F-213 | API read caching |
| F-214 | N+1 detection alarms |
| F-237 | Canary + rollback triggers |
| F-239 | Idempotent recovery verification |

---

## M1 Exit Criteria (Hard Gates)

M1 ships **only if all are true:**

### Security

- [ ] Tenant isolation test suite passes (F-156)
- [ ] RBAC enforcement coverage on all protected endpoints (F-004)
- [ ] CSRF/XSS gates pass (F-200)
- [ ] PII redaction verified (F-202)
- [ ] Webhook signature/replay safety passes (F-093)

### Functional

- [ ] **Candidate can:** register/login → build profile → apply → chat → schedule/reschedule → join interview sandbox → receive decision
- [ ] **Employer can:** create job → review pipeline → message → schedule → evaluate → record decision
- [ ] Demo role flows run end-to-end with reset (F-036/F-037/F-103/F-225)

### Reliability

- [ ] Reminder queues with retry/DLQ operational (F-023/F-050)
- [ ] Idempotency enforced for scheduling + billing writes (F-030)
- [ ] SLO dashboard live with alerts (F-099)

### Quality

- [ ] CI gates green (F-040)
- [ ] Error/loading/empty states present on all core pages (F-210)
- [ ] Keyboard + accessibility baseline passes (F-041/F-109/F-110/F-206/F-207)

### Observability

- [ ] Trace coverage for auth, apply, chat, schedule, interview, billing
- [ ] Correlation IDs visible end-to-end (F-143)

---

## Critical Path (Build Order)

```
1. Platform spine first
   F-040, F-146, F-142, F-143, F-155, F-156, F-038, F-039

2. Identity / tenancy / security
   F-001, F-002, F-003, F-004, F-151, F-031, F-032, F-200, F-202

3. Profile + jobs + apply
   F-006, F-010, F-011, F-012, F-013, F-014

4. Chat + schedule + reminders
   F-016, F-017, F-019, F-020, F-021, F-022, F-023, F-030, F-052

5. Interview + evaluation
   F-024, F-015, F-071, F-072, F-073

6. Billing skeleton + flags
   F-027, F-028, F-093, F-048, F-104, F-105, F-090

7. Demo + conversion
   F-036, F-037, F-103, F-101, F-221, F-222, F-223, F-224, F-225, F-190

8. Hardening + release
   F-050, F-099, F-237, F-239, F-240
```

---

## Team Lanes (Parallel Execution)

| Lane | Scope |
|------|-------|
| **Backend** | Auth, tenancy, RBAC, API contracts, idempotency, queue workers, observability |
| **Frontend** | App Router flows, design system, accessibility, command palette, demo UX |
| **Platform** | CI/CD, migrations, environments, telemetry, release automation |
| **QA** | Integration + e2e for critical path, cross-tenant abuse tests, demo regression pack |

---

## Risk Register (Top 8)

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | **Cross-tenant leak** | F-155/F-156 blocking gate, mandatory tenant key in repositories |
| 2 | **Scheduling race conditions** | F-030 idempotency + transactional meeting status events |
| 3 | **Queue instability under burst load** | F-050 DLQ/backoff + SLO alert thresholds |
| 4 | **Demo contaminates production state** | F-103 guardrails + isolated demo tenant + F-225 cleanup |
| 5 | **Billing webhook replay/fraud** | F-093 signature + replay window + idempotent event store |
| 6 | **A11y failures in interview/chat modals** | F-109/F-110 + keyboard e2e tests as release gate |
| 7 | **API/SDK drift** | F-140 + F-217 contract tests in CI |
| 8 | **Release regressions** | F-237 canary + F-240 go-live gate + rollback runbook F-150 |

---

## Definition of Done (Per Feature, Mandatory)

A feature can be marked **DONE** only when:

| Gate | Status |
|------|--------|
| Acceptance criteria checklist | ✅ |
| Unit tests | ✅ |
| Integration tests | ✅ |
| E2E (if user-facing) | ✅ |
| Tenant isolation check | ✅ |
| RBAC check | ✅ |
| Trace/log metrics present | ✅ |
| Error/loading/empty state coverage (UI) | ✅ |
| Demo-mode behavior defined (if applicable) | ✅ |
| Linked artifacts updated in CSV (API/DB/UI/Worker) | ✅ |

---

## Feature Count Summary

| Sprint | P0 | P1 | Total |
|--------|----|----|-------|
| S1 | 25 | 4 | 29 |
| S2 | 10 | 10 | 20 |
| S3 | 11 | 10 | 21 |
| S4 | 5 | 19 | 24 |
| **M1 Total** | **51** | **43** | **94** |

> 94 of 240 features (39%) ship in M1, covering the entire production-grade hiring loop.
