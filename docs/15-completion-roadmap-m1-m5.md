# EmploymentX Full Completion Roadmap (M1 → M5)

## 1. Milestone Overview

| Milestone | Theme | Feature Count | Outcome |
|-----------|-------|--------------|---------|
| **M1** | Production Foundation | 94 | Real hiring loop + demo mode + security/ops baseline |
| **M2** | Product Depth + Agency/Analytics | ~50 | Stronger workflows, reporting, agency ops, mature scheduling/messaging |
| **M3** | Enterprise + Compliance + Reliability | ~45 | Enterprise-ready control plane |
| **M4** | Intelligence + Globalization + Optimization | ~35 | Globally scalable and highly efficient platform |
| **M5** | Final 240/240 Closure + Launch Excellence | ~16 | Complete registry with audit-proof readiness |

---

## 2. Milestone M1: Production Foundation (Already Defined)

See `14-milestone-m1-plan.md` for full detail.

- **Scope:** All P0 + critical P1
- **Sprints:** S1–S4
- **Exit:** Full hiring loop, demo mode, security/ops baseline, CI gates green

---

## 3. Milestone M2: Product Depth + Agency/Analytics Expansion

**Scope:** Major P1 + selected P2
**Exit:** Feature-complete "pro" product for SMB + agency with strong reliability

### A) Scheduling + Interview Enrichment

| Feature ID | Name |
|------------|------|
| F-054 | Calendar sync links (Google/Microsoft-ready) |
| F-055 | Reminder user preferences |
| F-056 | Typing indicators (ephemeral) |
| F-057 | Presence status (online/away) |
| F-058 | Message search within conversation |
| F-059 | Pinned messages |
| F-060 | Conversation mute and notification controls |
| F-061 | Message soft-delete with audit trail |
| F-062 | Message edit history |
| F-063 | Reaction support on messages |
| F-066 | Pre-join device diagnostics |
| F-067 | Waiting room controls for host |
| F-068 | Screen share permission model |

### B) Messaging Maturity

| Feature ID | Name |
|------------|------|
| F-064 | Attachment malware scanning hook |
| F-069 | Interview recording metadata flow |
| F-070 | Transcript ingestion metadata |

### C) Evaluation / Decision Rigor

| Feature ID | Name |
|------------|------|
| F-074 | Pipeline board swimlanes and WIP limits |
| F-076 | Saved searches and alerts |
| F-077 | Boolean query support for recruiters |
| F-078 | Search relevance explainability panel |

### D) Agency Workflow Powerups

| Feature ID | Name |
|------------|------|
| F-079 | Candidate shortlist management |
| F-080 | Candidate comparison workspace |
| F-081 | Role blueprint composer |
| F-083 | Interviewer load balancing suggestions |
| F-085 | Interview agenda and prep packet |

### E) Billing/Plan Operations Maturity

| Feature ID | Name |
|------------|------|
| F-086 | Candidate feedback request workflow |
| F-087 | Offer comparison workspace |
| F-088 | Notification templates and localization keys |
| F-089 | Digest notifications (daily/weekly) |
| F-091 | Proration handling on plan changes |
| F-092 | Dunning/retry state machine |
| F-094 | Session anomaly detection |
| F-095 | IP/device-based risk scoring |

### F) Notifications and Inbox Intelligence

| Feature ID | Name |
|------------|------|
| F-096 | Data retention policy engine |
| F-097 | Legal hold support for records |
| F-098 | Data export package (tenant scoped) |
| F-100 | Business KPIs telemetry |

### G) Demo Platform Expansion

| Feature ID | Name |
|------------|------|
| F-101 | Role-based demo tours (if not completed in M1) |
| F-102 | Demo dataset versioning |
| F-106 | Shortcut cheat-sheet modal |
| F-107 | Shortcut conflict resolver UI |

### H) UX/Design/Interaction Layer

| Feature ID | Name |
|------------|------|
| F-108 | Context-aware command actions |
| F-112 | Locale-safe date/time formatting |
| F-114 | Read/write DB split strategy |

### I) Platform and Policy

| Feature ID | Name |
|------------|------|
| F-116 | Search index refresh jobs |
| F-117 | Schema-level validation and enum normalization |
| F-118 | Soft-delete policy standardization |
| F-119 | Reference integrity checker jobs |
| F-120 | Agency client-facing branded portal |

### M2 Exit Criteria

- [ ] Agency workflow usable end-to-end with SLA alerting
- [ ] Reporting + notification reliability stable
- [ ] No critical UX state gaps (loading/error/empty) in core areas
- [ ] All M2 features pass DoD checklist
- [ ] Demo scenarios updated for new capabilities

---

## 4. Milestone M3: Enterprise + Compliance + Advanced Reliability

**Scope:** Enterprise governance, compliance depth, resilience/ops hardening
**Exit:** Enterprise-ready operations + compliance posture

### A) Enterprise Governance + Audit

| Feature ID | Name |
|------------|------|
| F-121 | Recruiter assignment and ownership rules |
| F-122 | Client SLA contract tracking |
| F-123 | Submission-to-interview conversion analytics |
| F-124 | Employer legitimacy verification workflow |
| F-125 | Candidate identity verification workflow |

### B) Trust & Safety Expansion

| Feature ID | Name |
|------------|------|
| F-126 | Scam/fraud reporting center |
| F-127 | Abuse pattern detection signals |
| F-128 | DSAR request intake and tracking |

### C) Privacy/Compliance

| Feature ID | Name |
|------------|------|
| F-129 | Consent receipt ledger |
| F-130 | Purpose-based access controls metadata |
| F-132 | Interviewer calibration variance report |
| F-133 | Quality-of-hire feedback loop scaffolding |
| F-134 | Candidate opportunity tracker board |

### D) Analytics/Reporting Depth

| Feature ID | Name |
|------------|------|
| F-135 | Interview availability quick actions |
| F-136 | Profile completeness scoring |
| F-137 | Resume/profile import assistant |
| F-138 | Job post approval workflow (optional) |
| F-139 | Job duplication and template library |

### E) Contracts/API Maturity

| Feature ID | Name |
|------------|------|
| F-145 | API deprecation headers and notices |
| F-147 | Expand-contract deployment pattern automation |
| F-149 | Full-text index tuning for jobs/candidates |

### F) Identity/Tenancy Extensions

| Feature ID | Name |
|------------|------|
| F-153 | Session revocation (all devices) |
| F-154 | Trusted device management |
| F-157 | Tenant cloning for staging/demo seeds |

### G) Candidate/Jobs/Application Advanced Features

| Feature ID | Name |
|------------|------|
| F-158 | Portfolio link validation and previews |
| F-160 | Availability badge on profile |
| F-161 | Compensation range normalization and currency support |
| F-163 | Duplicate job detection |
| F-164 | Candidate withdrawal workflow |
| F-165 | Reapply eligibility rules |
| F-166 | Bulk stage actions with safeguards |
| F-167 | Pipeline snapshot/version history |

### H) Messaging/Scheduling Enhancements

| Feature ID | Name |
|------------|------|
| F-168 | Conversation export for compliance roles |
| F-169 | Read receipt privacy controls |
| F-170 | Message retention by tenant policy |
| F-171 | Round-robin interviewer slot assignment |
| F-174 | Reminder acknowledgment tracking |
| F-175 | No-show auto-resolution workflow |

### I) Interview Operational Depth

| Feature ID | Name |
|------------|------|
| F-176 | In-call network quality indicator |
| F-177 | Auto-rejoin and reconnect flow |
| F-178 | Device switch mid-call support |
| F-179 | Interview notes private/public sections |
| F-180 | Decision recommendation assistant scaffolding |

### M3 Exit Criteria

- [ ] Enterprise audit/compliance workflows validated
- [ ] Trust/safety response lifecycle operational
- [ ] Advanced scheduling/interview resilience proven
- [ ] All M3 features pass DoD checklist
- [ ] Compliance evidence generation functional

---

## 5. Milestone M4: Intelligence + Globalization + Optimization

**Scope:** Higher-order intelligence features, localization, deeper performance economics
**Exit:** Global-scale posture + mature operational intelligence

### A) Billing Enterprise Readiness

| Feature ID | Name |
|------------|------|
| F-181 | Seat-based billing support |
| F-182 | Annual/monthly plan switching |
| F-183 | Invoice tax metadata support |
| F-184 | Billing role permissions and approvals |

### B) Notification Intelligence / Analytics

| Feature ID | Name |
|------------|------|
| F-186 | Notification channel fallback rules |
| F-187 | User do-not-disturb windows |
| F-188 | Recruiter productivity dashboard |
| F-189 | Meeting conversion funnel metrics |

### C) Agency Advanced Systems

| Feature ID | Name |
|------------|------|
| F-191 | Client approval gates on candidate submissions |
| F-192 | Agency recruiter leaderboard |
| F-193 | Agency SLA penalty simulation model |

### D) Trust/Safety Advanced

| Feature ID | Name |
|------------|------|
| F-194 | Content moderation queue for reports |
| F-195 | Automated suspicious link detection in chat |
| F-196 | Block/report user controls |

### E) Compliance/Security Uplift

| Feature ID | Name |
|------------|------|
| F-197 | Policy version changelog and acceptance records |
| F-198 | Regional data residency routing hooks |
| F-199 | Sensitive field encryption-at-rest mapping |
| F-201 | Secrets management and rotation workflow |
| F-203 | Queue backpressure and circuit breaker policies |
| F-204 | Graceful degradation modes for external provider outages |
| F-205 | Disaster recovery backup restore drill automation |

### F) UX + Performance Mastery

| Feature ID | Name |
|------------|------|
| F-209 | Data table usability patterns (sort/filter/virtual) |
| F-215 | Cold-start and startup health optimization |

### G) DX and Release Systems

| Feature ID | Name |
|------------|------|
| F-218 | Story-driven component catalog |
| F-219 | Code ownership and review routing rules |
| F-220 | Release notes automation from feature IDs |

### M4 Exit Criteria

- [ ] Globalization scaffolding in production paths
- [ ] Backpressure/degradation/DR objectives met
- [ ] Operational dashboards predictive, not reactive
- [ ] All M4 features pass DoD checklist
- [ ] Performance budgets met at scale

---

## 6. Milestone M5: Final 240/240 Closure + Launch Excellence

**Scope:** Residual features, polish, final audits, go-to-market hardening
**Exit:** Complete feature registry with audit-proof readiness

### Remaining Features

| Feature ID | Name |
|------------|------|
| F-226 | Universal quick actions (new message/meeting/job) |
| F-227 | Recent actions and pinned commands |
| F-228 | Role-aware command suggestions |
| F-229 | CSV export for key dashboards |
| F-230 | Scheduled report delivery (in-app/email) |
| F-231 | SSO/SAML readiness scaffolding |
| F-232 | SCIM provisioning readiness scaffolding |
| F-233 | Advanced audit filters and saved views |
| F-234 | Role-based data masking in UI |
| F-235 | Internationalization framework scaffolding |
| F-236 | Localized timezone workweek rules |
| F-238 | Chaos test scenarios for critical workflows |
| Any carryover from M1–M4 | |
| F-240 | Final go-live gate signoff at 240/240 |

### M5 Exit Criteria (Final)

- [ ] **240/240** feature registry status = DONE/VERIFIED
- [ ] Zero P0 and zero unresolved high-risk security findings
- [ ] All go-live gates green in F-240 dashboard
- [ ] Final dry-run + rollback simulation signed off
- [ ] Release report emitted and archived

---

## 7. Delivery Operating System

### Team Topology

| Pod | Scope |
|-----|-------|
| **Core Platform** | Contracts, CI/CD, observability, flags, migrations |
| **Identity/Security** | Auth, RBAC, tenancy, trust, compliance |
| **Hiring Workflow** | Candidate/jobs/applications/pipeline |
| **Comms** | Chat/scheduling/reminders/interview |
| **Billing/Entitlements** | Plans, subscriptions, invoices, controls |
| **Experience** | Frontend system, accessibility, motion, command center |
| **Data/Analytics** | Reporting, funnels, productivity, exports |
| **QA/SRE** | E2E, perf, chaos, reliability, launch gates |

### Cadence

- **2-week sprints**
- Mid-sprint architecture checkpoint
- End-sprint release candidate
- Hard go/no-go review with gate dashboard

### Non-negotiable Gates Each Sprint

| Gate | Enforcement |
|------|------------|
| No failing critical tests | CI blocks merge |
| No unresolved P0/P1 security findings | Security review required |
| Trace coverage for all new endpoints/workers | OTel verification |
| Tenant isolation proof for changed modules | F-156 harness |
| Demo mode safety proof for user-facing additions | Demo regression pack |

---

## 8. Unified Technical Blueprint

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | Next.js App Router + React + TypeScript |
| Styling | Tailwind CSS + Radix UI primitives |
| Commands | cmdk |
| Animation | GSAP (cinematic) + Motion (micro-interactions) |
| Data | TanStack Query + Redux Toolkit + react-redux |
| Forms | React Hook Form + Zod |
| Flags | OpenFeature client SDK |
| Accessibility | Enforced in CI (axe-core, keyboard e2e) |

### Backend

| Layer | Technology |
|-------|-----------|
| API | Rust Axum (primary) + Next.js route handlers (BFF) |
| Database | PostgreSQL + sqlx (Rust) / Prisma (TS) |
| Cache | Redis |
| Jobs | BullMQ (TS workers) |
| Auth | Auth.js + custom JWT |
| Policy | CASL (TS) / custom RBAC (Rust) |
| Idempotency | Middleware + idempotency_keys table |
| Contracts | Zod schemas in `packages/contracts` |

### Cross-cutting

| Concern | Implementation |
|---------|---------------|
| Observability | OpenTelemetry + Sentry + structured logging |
| Security | Rate limiting, CSRF/XSS hardening, webhook signature verification |
| Audit | Append-only ledger + PII redaction + policy versioning |
| Release | Canary + rollback + DR drills + chaos tests |
| Tenancy | Tenant-safe query helpers + isolation test harness |

---

## 9. Test Matrix (Complete Coverage Standard)

For every feature F-xxx:

| Test Class | Scope | Gate |
|-----------|-------|------|
| **Unit** | Domain logic, validators, policy checks | CI blocking |
| **Integration** | Endpoint + DB + queue + cache behavior | CI blocking |
| **E2E** | User-critical flows and role-based paths | Release blocking |
| **Security** | Authz denial paths, tenant isolation, replay protection | Release blocking |
| **Performance** | p95 latency, query count budgets, web vitals | Budget threshold |
| **Reliability** | Retry/DLQ, outage fallback, idempotent recovery | Release blocking |
| **Accessibility** | Keyboard-only + screen reader landmarks | CI blocking |
| **Demo** | Sandbox safety + deterministic reset | Release blocking |

---

## 10. One-Shot Execution Prompt

```
You are the EmploymentX Principal Engineering Executor operating at Apple Principal
Engineer ICT Level 7.

Mission:
Deliver full production completion of EmploymentX from current M1 baseline to full
F-001..F-240 closure with zero gaps, zero placeholder UX, and verifiable
enterprise-grade quality.

Operating constraints:
- Stack is fixed:
  - Frontend: Next.js App Router, React, TypeScript, Tailwind, Radix, cmdk, GSAP, Motion
  - Forms/validation: React Hook Form, Zod
  - State/data: TanStack Query, Redux Toolkit, react-redux
  - Backend: Rust Axum (primary API), Next.js APIs/server actions (BFF),
    PostgreSQL, sqlx/Prisma, BullMQ, Redis
  - Auth/policy: Auth.js + CASL/custom RBAC
  - Observability: OpenTelemetry, Sentry, structured logs
  - Billing: Stripe
  - Flags: OpenFeature
- Architecture must remain multi-tenant-safe and RBAC-enforced.
- Every change must be production-quality, fully tested, and observable.
- No mock-only pages in production paths.
- Demo mode must remain isolated and side-effect safe.

Execution plan:
1) Ingest feature registry F-001..F-240 and mark current status baseline.
2) Execute milestone sequence M2 → M5:
   - M2: Feature depth (workflow, agency, analytics, scheduling/chat enrichment)
   - M3: Enterprise + compliance + trust/safety + advanced reliability
   - M4: Globalization + intelligence + operational excellence
   - M5: Final closure and go-live hardening
3) For each feature:
   - Implement API + DB + worker + UI artifacts
   - Add observability (trace/log/metric)
   - Add tests (unit/integration/e2e/security where applicable)
   - Update feature status + evidence links
4) Enforce hard quality gates each sprint:
   - CI pass
   - Tenant isolation proof
   - RBAC denial-path tests
   - Performance budgets
   - Accessibility checks
   - Demo safety checks
5) Maintain release readiness:
   - Canary strategy
   - Rollback scripts
   - Runbooks
   - Launch gate dashboard

Required outputs each sprint:
- Updated feature registry table with status and evidence.
- PR set grouped by feature IDs.
- Test coverage delta and failing-risk report.
- Security and reliability delta report.
- Go/No-Go recommendation with precise blockers.

Definition of done per feature:
- Acceptance criteria satisfied
- Unit + integration tests passing
- E2E added when user-facing
- Observability hooks in place
- Security checks completed
- Docs/runbook updated
- Demo behavior defined if exposed publicly

Final delivery condition:
Do not stop until all F-001..F-240 are in DONE/VERIFIED with launch gates green
and final release report emitted.
```

---

## 11. Single Source of Truth Tracker Format

Use this exact schema as the master tracker row for every feature:

| Column | Type | Description |
|--------|------|-------------|
| `feature_id` | string | F-001..F-240 |
| `milestone` | enum | M1, M2, M3, M4, M5 |
| `status` | enum | NOT_STARTED, IN_PROGRESS, BLOCKED, DONE, VERIFIED |
| `api_pr` | string | PR link for API changes |
| `db_pr` | string | PR link for DB migration |
| `ui_pr` | string | PR link for UI changes |
| `worker_pr` | string | PR link for worker/job changes |
| `tests_pr` | string | PR link for test additions |
| `observability_pr` | string | PR link for trace/log/metric additions |
| `security_review` | enum | PASS, FAIL, N/A |
| `qa_signoff` | enum | PASS, FAIL, PENDING |
| `demo_impact` | enum | YES, NO |
| `risk_level` | enum | LOW, MED, HIGH |
| `blocker` | string | Description of blocker (if any) |
| `owner` | string | Assignee |
| `target_sprint` | string | S1..S15 |
| `evidence_links` | string | Links to test reports, screenshots, etc. |

### CSV Header

```csv
feature_id,milestone,status,api_pr,db_pr,ui_pr,worker_pr,tests_pr,observability_pr,security_review,qa_signoff,demo_impact,risk_level,blocker,owner,target_sprint,evidence_links
```
