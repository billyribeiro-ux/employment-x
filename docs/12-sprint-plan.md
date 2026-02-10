# EmploymentX — Sprint Plan with Feature ID Traceability

Version: 1.0.0
Date: 2026-02-09

---

## Sprint 0: Foundation (COMPLETE)

**Duration**: 2 weeks
**Goal**: Monorepo scaffold, shared packages, API skeleton, DB schema, Docker, CI

| Task | Feature IDs | Status |
|------|------------|--------|
| Monorepo scaffold (pnpm, turbo, TS configs) | — | DONE |
| Shared packages (config, contracts, sdk, ui) | — | DONE |
| Rust Axum API skeleton with all modules | 001–003, 008, 011, 012, 021–028, 041–044, 051–054, 071–075, 091–096, 111–116, 136–139, 156–160, 176–183, 191–194, 197–198, 208–209, 231 | DONE |
| PostgreSQL schema (60+ tables) | — | DONE |
| Docker Compose (Postgres + Redis) | — | DONE |
| Next.js frontend skeleton | — | DONE |
| CI/CD pipeline (GitHub Actions) | — | DONE |
| Design token system (EmploymentX palette) | — | DONE |
| Demo infrastructure (API + DB + frontend) | 191–194, 197–198, 208–209 | DONE |
| Keyboard engine + shortcut help overlay | 176–183 | DONE |
| Animation system (GSAP/Motion tokens) | — | DONE |
| Architecture spec + delivery artifacts | — | DONE |

---

## Sprint 1: Core Auth & Profile Flows

**Duration**: 2 weeks
**Goal**: Working auth, candidate/employer profiles, job posting

| Task | Feature IDs | Priority |
|------|------------|----------|
| JWT refresh token rotation | 004 | HIGH |
| Email verification flow | 014 | HIGH |
| Password reset flow | 007 | HIGH |
| Candidate profile UI (detail + edit) | 029 | HIGH |
| Candidate skills management | 025 | MEDIUM |
| Employer company branding | 045 | MEDIUM |
| Job post detail view UI | 055 | HIGH |
| Job post creation UI | 051 | HIGH |
| Job search (full-text) | 057 | MEDIUM |
| Unit tests: auth, candidates, jobs | 001–003, 021–028, 051–054 | HIGH |
| Integration tests: tenant isolation, RBAC | 011, 012 | HIGH |

---

## Sprint 2: Application Pipeline & Chat

**Duration**: 2 weeks
**Goal**: Full application flow, chat messaging UI

| Task | Feature IDs | Priority |
|------|------------|----------|
| Application pipeline board UI (Kanban) | 076 | HIGH |
| Application detail view UI | 080 | HIGH |
| Scorecard submission UI | 074, 144 | HIGH |
| Application rejection reasons | 078 | MEDIUM |
| Chat UI (conversation list) | 109 | HIGH |
| Chat UI (message thread) | 107, 108 | HIGH |
| Message delivery receipts | 097 | HIGH |
| Chat rate limiting | 101 | MEDIUM |
| E2E: candidate demo flow | 205 | HIGH |
| E2E: employer demo flow | 206 | HIGH |

---

## Sprint 3: Scheduling & Reminders

**Duration**: 2 weeks
**Goal**: Full meeting lifecycle UI, reminder delivery

| Task | Feature IDs | Priority |
|------|------------|----------|
| Meeting calendar view UI | 118 | HIGH |
| Meeting status timeline UI | 132 | MEDIUM |
| Reminder delivery (email/in-app) | 120 | HIGH |
| Reminder retry logic | 135 | MEDIUM |
| Availability blocks | 117 | MEDIUM |
| Meeting conflict detection | 123 | MEDIUM |
| E2E: message + schedule + reschedule | 111–114 | HIGH |
| Integration: meeting lifecycle | 111–114, 119, 121 | HIGH |
| Demo TTL auto-expiry | 195 | MEDIUM |
| Demo inactivity reset | 196 | MEDIUM |

---

## Sprint 4: Video Interviews & Billing

**Duration**: 2 weeks
**Goal**: Interview room UI, billing portal

| Task | Feature IDs | Priority |
|------|------------|----------|
| Video room UI (basic) | 140 | HIGH |
| PiP mode | 141 | HIGH |
| Interview scorecard UI | 144 | HIGH |
| Interview scheduling integration | 145 | MEDIUM |
| Billing portal UI | 165 | HIGH |
| Subscription cancellation | 161 | HIGH |
| Invoice history | 162 | MEDIUM |
| Entitlement enforcement | 164 | HIGH |
| E2E: interview launch (sandbox) | 140 | HIGH |
| E2E: subscription sandbox journey | 165, 166 | HIGH |

---

## Sprint 5: Search, Notifications & Polish

**Duration**: 2 weeks
**Goal**: Global search, notifications, accessibility audit

| Task | Feature IDs | Priority |
|------|------------|----------|
| Global search | 211 | HIGH |
| Search suggestions | 212 | MEDIUM |
| In-app notifications | 221 | HIGH |
| Email notifications | 222 | HIGH |
| Notification preferences | 224 | MEDIUM |
| Candidate search (full-text) | 026 | HIGH |
| Accessibility audit + fixes | — | HIGH |
| Shortcut settings UI | 184 | MEDIUM |
| Command palette actions (contextual) | 185 | MEDIUM |
| Performance optimization | — | MEDIUM |

---

## Sprint 6: Compliance, Security & Hardening

**Duration**: 2 weeks
**Goal**: GDPR, security hardening, SLO monitoring

| Task | Feature IDs | Priority |
|------|------------|----------|
| MFA enrollment + verification | 005, 006 | HIGH |
| Account deletion (GDPR) | 015, 235 | HIGH |
| Data portability (GDPR) | 035, 236 | HIGH |
| Consent management | 016 | HIGH |
| Audit log viewer UI | 232 | MEDIUM |
| Security tests (all vectors) | — | HIGH |
| SLO dashboard setup | — | HIGH |
| IP allowlisting | 238 | MEDIUM |
| Rate limiting hardening | 018, 200, 210 | HIGH |
| Incident response playbook | 240 | MEDIUM |

---

## Velocity Assumptions

- Team: 3 engineers (1 backend, 1 frontend, 1 full-stack)
- Sprint: 2 weeks
- Capacity: ~30 story points per sprint
- Feature complexity: 1–5 points per feature ID
- Total estimated: ~180 sprints points across 6 sprints
