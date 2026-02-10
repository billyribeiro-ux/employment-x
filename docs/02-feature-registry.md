# EmploymentX — Feature Registry

Version: 1.0.0
Date: 2026-02-09

Status Legend: `NOT_STARTED` | `IN_PROGRESS` | `BLOCKED` | `DONE`

---

## Identity & Tenancy (001–020)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 001 | User registration (email+password) | DONE | Argon2 hash, email validation, duplicate check | — | unit, integration | `auth.rs`, `users` table |
| 002 | User login (JWT issuance) | DONE | Access+refresh tokens, correct claims | 001 | unit, integration | `auth.rs` |
| 003 | User logout (token invalidation) | DONE | Session cleared, token blacklisted | 002 | unit | `auth.rs` |
| 004 | JWT refresh token rotation | IN_PROGRESS | Atomic rotation, old token invalidated | 002 | unit, integration | `auth.rs` |
| 005 | MFA enrollment (TOTP) | NOT_STARTED | QR code generation, backup codes | 001 | unit, integration | — |
| 006 | MFA verification on login | NOT_STARTED | TOTP validation, rate limiting | 005 | unit, integration | — |
| 007 | Password reset flow | NOT_STARTED | Email token, expiry, rate limit | 001 | integration | — |
| 008 | Organization creation | DONE | Name, slug, unique constraint | 001 | unit | `organizations` table |
| 009 | Organization member invite | NOT_STARTED | Email invite, role assignment | 008 | integration | — |
| 010 | Organization member management | IN_PROGRESS | List, update role, remove | 008 | unit, integration | `organization_members` |
| 011 | Role-based access control | DONE | Admin/owner/manager/recruiter/viewer/candidate | 008 | unit, integration | `middleware/auth.rs` |
| 012 | Tenant isolation middleware | DONE | All queries scoped by org_id | 008, 011 | integration, security | `middleware/tenant.rs` |
| 013 | Session management | IN_PROGRESS | Active sessions list, revoke | 002 | unit | `sessions` table |
| 014 | Email verification flow | NOT_STARTED | Verification token, resend | 001 | integration | — |
| 015 | Account deletion request | NOT_STARTED | Soft delete, GDPR compliance | 001 | integration | `deletion_requests` |
| 016 | Consent management | NOT_STARTED | Track user consents, audit | 001 | unit | `consents` table |
| 017 | Security event logging | DONE | Login attempts, password changes | 001 | unit | `security_events` table |
| 018 | Rate limiting (auth endpoints) | IN_PROGRESS | Redis-backed sliding window | — | integration | `middleware` |
| 019 | API key management | NOT_STARTED | Generate, revoke, scope | 008 | unit, integration | — |
| 020 | OAuth2 provider integration | NOT_STARTED | Google, GitHub SSO | 001 | integration | — |

## Candidate Management (021–040)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 021 | Candidate profile creation | DONE | Headline, summary, location, availability | 001 | unit | `candidates.rs` |
| 022 | Candidate profile update | DONE | Partial update, version bump | 021 | unit | `candidates.rs` |
| 023 | Candidate profile versioning | IN_PROGRESS | Snapshot on update, diff view | 021 | unit | `candidate_profile_versions` |
| 024 | Candidate document upload | DONE | Resume, cover letter, portfolio | 021 | unit | `candidate_documents` |
| 025 | Candidate skills management | IN_PROGRESS | Add/remove skills, proficiency | 021 | unit | `candidate_skills` |
| 026 | Candidate search (full-text) | NOT_STARTED | tsvector search, filters, pagination | 021 | integration | — |
| 027 | Candidate availability status | DONE | Open/passive/closed toggle | 021 | unit | `candidates.rs` |
| 028 | Candidate list (paginated) | DONE | Cursor pagination, org-scoped | 012, 021 | unit | `candidates.rs` |
| 029 | Candidate detail view (UI) | NOT_STARTED | Profile card, documents, skills | 021 | e2e | — |
| 030 | Candidate pipeline board (UI) | NOT_STARTED | Kanban view of applications | 021, 051 | e2e | — |
| 031 | Candidate bulk actions | NOT_STARTED | Multi-select, bulk stage change | 021, 051 | integration | — |
| 032 | Candidate notes | NOT_STARTED | Internal notes per candidate | 021 | unit | — |
| 033 | Candidate tags | NOT_STARTED | Custom tags, filter by tag | 021 | unit | — |
| 034 | Candidate export (CSV) | NOT_STARTED | Export filtered list | 021 | integration | — |
| 035 | Candidate GDPR data export | NOT_STARTED | Full data package | 021, 016 | integration | — |
| 036 | Candidate duplicate detection | NOT_STARTED | Email/name matching | 021 | unit | — |
| 037 | Candidate referral tracking | NOT_STARTED | Referral source, attribution | 021 | unit | — |
| 038 | Candidate activity timeline | NOT_STARTED | Aggregated events view | 021 | unit | — |
| 039 | Candidate comparison view | NOT_STARTED | Side-by-side profiles | 021 | e2e | — |
| 040 | Candidate profile sharing | NOT_STARTED | Shareable link with expiry | 021 | integration | — |

## Employer Management (041–050)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 041 | Company creation | DONE | Name, industry, size, location | 008 | unit | `employers.rs` |
| 042 | Company update | DONE | Partial update | 041 | unit | `employers.rs` |
| 043 | Company list (paginated) | DONE | Org-scoped, cursor pagination | 012, 041 | unit | `employers.rs` |
| 044 | Employer profile | DONE | Linked to user + company | 041 | unit | `employers.rs` |
| 045 | Company branding (logo, banner) | NOT_STARTED | Image upload, CDN storage | 041 | integration | — |
| 046 | Company team page | NOT_STARTED | Public team directory | 041 | e2e | — |
| 047 | Company analytics dashboard | NOT_STARTED | Hiring metrics, pipeline stats | 041 | e2e | — |
| 048 | Company job board embed | NOT_STARTED | Embeddable widget | 041, 061 | integration | — |
| 049 | Company verification | NOT_STARTED | Domain verification flow | 041 | integration | — |
| 050 | Multi-company management | NOT_STARTED | Agency managing multiple companies | 041, 008 | integration | — |

## Jobs (051–070)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 051 | Job post creation | DONE | Title, description, type, salary, location | 041 | unit | `jobs.rs` |
| 052 | Job post update | DONE | Partial update, version bump | 051 | unit | `jobs.rs` |
| 053 | Job post publishing | DONE | Draft → published transition | 051 | unit | `jobs.rs` |
| 054 | Job post list (paginated) | DONE | Org-scoped, status filter | 012, 051 | unit | `jobs.rs` |
| 055 | Job post detail view (UI) | NOT_STARTED | Full job card with apply button | 051 | e2e | — |
| 056 | Job post versioning | IN_PROGRESS | Snapshot on publish | 051 | unit | `job_post_versions` |
| 057 | Job search (full-text) | NOT_STARTED | tsvector, filters, facets | 051 | integration | — |
| 058 | Job post templates | NOT_STARTED | Reusable templates | 051 | unit | — |
| 059 | Job post scheduling | NOT_STARTED | Scheduled publish/unpublish | 051 | integration | — |
| 060 | Job post analytics | NOT_STARTED | Views, applies, conversion | 051 | unit | — |
| 061 | Job board (public) | NOT_STARTED | Public listing page | 051 | e2e | — |
| 062 | Job post duplication | NOT_STARTED | Clone existing post | 051 | unit | — |
| 063 | Job post approval workflow | NOT_STARTED | Manager approval before publish | 051, 011 | integration | — |
| 064 | Job requirements matching | NOT_STARTED | Skills match scoring | 051, 025 | unit | — |
| 065 | Job post expiry | NOT_STARTED | Auto-close after deadline | 051 | integration | — |
| 066 | Job salary benchmarking | NOT_STARTED | Market rate comparison | 051 | unit | — |
| 067 | Job post multi-location | NOT_STARTED | Multiple locations per post | 051 | unit | — |
| 068 | Job post custom fields | NOT_STARTED | Org-defined fields | 051, 008 | unit | — |
| 069 | Job post SEO metadata | NOT_STARTED | OG tags, structured data | 051 | unit | — |
| 070 | Job post social sharing | NOT_STARTED | Share links, tracking | 051 | unit | — |

## Applications (071–090)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 071 | Apply to job | DONE | Idempotent, duplicate check | 051, 021 | unit, integration | `applications.rs` |
| 072 | Application stage transition | DONE | Validated transitions, audit | 071 | unit, integration | `applications.rs` |
| 073 | Application detail view | DONE | Full application with history | 071 | unit | `applications.rs` |
| 074 | Scorecard submission | IN_PROGRESS | Criteria ratings, notes | 071 | unit | `scorecards` |
| 075 | Hiring decision | DONE | Hire/reject with reason | 071, 074 | unit | `applications.rs` |
| 076 | Application pipeline view (UI) | NOT_STARTED | Kanban board | 071 | e2e | — |
| 077 | Application bulk stage change | NOT_STARTED | Multi-select transition | 071 | integration | — |
| 078 | Application rejection reasons | IN_PROGRESS | Coded reasons, analytics | 075 | unit | `decision_records` |
| 079 | Application source tracking | DONE | Direct/referral/board | 071 | unit | `applications` |
| 080 | Application timeline | NOT_STARTED | Event history view | 071 | e2e | — |
| 081 | Application email notifications | NOT_STARTED | Stage change emails | 071 | integration | — |
| 082 | Application offer letter | NOT_STARTED | Template, send, track | 075 | integration | — |
| 083 | Application feedback request | NOT_STARTED | Request from interviewer | 071 | integration | — |
| 084 | Application auto-advance rules | NOT_STARTED | Configurable auto-stage | 071 | unit | — |
| 085 | Application SLA tracking | NOT_STARTED | Time-in-stage alerts | 071 | unit | — |
| 086 | Application comparison | NOT_STARTED | Side-by-side candidates | 071 | e2e | — |
| 087 | Application custom stages | NOT_STARTED | Org-defined pipeline | 071, 008 | unit | — |
| 088 | Application disposition codes | NOT_STARTED | EEO compliance | 075 | unit | — |
| 089 | Application activity feed | NOT_STARTED | Real-time updates | 071 | e2e | — |
| 090 | Application export | NOT_STARTED | CSV/PDF export | 071 | integration | — |

## Chat (091–110)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 091 | Create conversation | DONE | Org-scoped, participant validation | 012 | unit | `chat.rs` |
| 092 | Send message | DONE | Durable, org-scoped | 091 | unit | `chat.rs` |
| 093 | List conversations | DONE | Paginated, last message preview | 091 | unit | `chat.rs` |
| 094 | Get messages | DONE | Paginated, ordered | 091 | unit | `chat.rs` |
| 095 | Mark as read | DONE | Read receipts | 091 | unit | `chat.rs` |
| 096 | Upload attachment | DONE | File upload, size limit | 091 | unit | `chat.rs` |
| 097 | Message delivery receipts | IN_PROGRESS | Sent/delivered/read states | 092 | unit | `message_receipts` |
| 098 | Message editing | NOT_STARTED | Edit with history | 092 | unit | `message_edits` |
| 099 | Message reactions | NOT_STARTED | Emoji reactions | 092 | unit | `message_reactions` |
| 100 | Chat search | NOT_STARTED | Full-text message search | 092 | integration | — |
| 101 | Chat rate limiting | IN_PROGRESS | Per-user message rate | 092 | integration | — |
| 102 | Chat typing indicators | NOT_STARTED | Real-time via WebSocket | 091 | e2e | — |
| 103 | Chat notification preferences | NOT_STARTED | Mute, snooze per conversation | 091 | unit | — |
| 104 | Chat thread replies | NOT_STARTED | Threaded conversations | 092 | unit | — |
| 105 | Chat message pinning | NOT_STARTED | Pin important messages | 092 | unit | — |
| 106 | Chat conversation archiving | NOT_STARTED | Archive/unarchive | 091 | unit | — |
| 107 | Chat UI (message list) | NOT_STARTED | Virtualized list, real-time | 091 | e2e | — |
| 108 | Chat UI (compose) | NOT_STARTED | Rich text, attachments | 092 | e2e | — |
| 109 | Chat UI (conversation list) | NOT_STARTED | Sidebar with unread counts | 093 | e2e | — |
| 110 | Chat export | NOT_STARTED | Conversation export | 091 | integration | — |

## Scheduling & Reminders (111–135)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 111 | Create meeting request | DONE | Proposed slots, participants | 012 | unit, integration | `scheduling.rs` |
| 112 | Accept meeting | DONE | Idempotent, slot validation, reminders enqueued | 111 | unit, integration | `scheduling.rs` |
| 113 | Deny meeting | DONE | Reason-coded, notify requester | 111 | unit, integration | `scheduling.rs` |
| 114 | Reschedule meeting | DONE | Lineage event, cancel old reminders, new reminders | 111 | unit, integration | `scheduling.rs` |
| 115 | Get meeting detail | DONE | Full meeting with participants | 111 | unit | `scheduling.rs` |
| 116 | List meetings | DONE | Paginated, org-scoped | 111 | unit | `scheduling.rs` |
| 117 | Meeting availability blocks | NOT_STARTED | User availability windows | 111 | unit | `meeting_availability_blocks` |
| 118 | Meeting calendar view (UI) | NOT_STARTED | Weekly/monthly calendar | 111 | e2e | — |
| 119 | Meeting reminder job creation | DONE | Enqueue on accept | 112 | unit | `reminder_jobs` |
| 120 | Meeting reminder delivery | IN_PROGRESS | Email/push at scheduled time | 119 | integration | `reminder_delivery_events` |
| 121 | Meeting reminder cancellation | DONE | Cancel on reschedule/deny | 114, 113 | unit | `scheduling.rs` |
| 122 | Meeting timezone handling | DONE | Store in user TZ, display in local | 111 | unit | `scheduling.rs` |
| 123 | Meeting conflict detection | NOT_STARTED | Overlapping slot warning | 111, 117 | unit | — |
| 124 | Meeting external calendar sync | NOT_STARTED | Google/Outlook integration | 111 | integration | — |
| 125 | Meeting video link generation | NOT_STARTED | Auto-create room on accept | 112, 141 | integration | — |
| 126 | Meeting notes | NOT_STARTED | Pre/post meeting notes | 111 | unit | — |
| 127 | Meeting feedback prompt | NOT_STARTED | Post-meeting feedback request | 111 | integration | — |
| 128 | Reminder preferences | NOT_STARTED | User-configurable timing | 119 | unit | — |
| 129 | Reminder channels | NOT_STARTED | Email, push, SMS | 120 | integration | — |
| 130 | Meeting batch scheduling | NOT_STARTED | Schedule multiple at once | 111 | integration | — |
| 131 | Meeting templates | NOT_STARTED | Reusable meeting configs | 111 | unit | — |
| 132 | Meeting status timeline (UI) | NOT_STARTED | Visual status history | 111 | e2e | — |
| 133 | Scheduling keyboard shortcuts | DONE | Shift+A/D/R for accept/deny/reschedule | 111 | e2e | `keyboard-engine.ts` |
| 134 | Meeting participant management | DONE | Add/remove participants | 111 | unit | `meeting_participants` |
| 135 | Reminder job retry logic | NOT_STARTED | Exponential backoff | 120 | unit | — |

## Video Interviews (136–155)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 136 | Create video room | DONE | Room with config, org-scoped | 012 | unit | `interviews.rs` |
| 137 | Generate room token | DONE | Time-limited, user-scoped | 136 | unit | `interviews.rs` |
| 138 | Send session event | DONE | Join/leave/pause events | 136 | unit | `interviews.rs` |
| 139 | Submit interviewer feedback | DONE | Scorecard + notes | 136 | unit | `interviews.rs` |
| 140 | Video room UI (basic) | NOT_STARTED | Join room, video/audio | 136 | e2e | — |
| 141 | PiP mode | NOT_STARTED | Picture-in-picture toggle | 140 | e2e | `pip_session_states` |
| 142 | Screen sharing | NOT_STARTED | Share screen in room | 140 | e2e | — |
| 143 | Recording consent | NOT_STARTED | Consent prompt, audit | 140 | integration | — |
| 144 | Interview scorecard UI | NOT_STARTED | Rating criteria form | 139 | e2e | — |
| 145 | Interview scheduling integration | NOT_STARTED | Link room to meeting | 136, 112 | integration | — |
| 146 | Interview playback | NOT_STARTED | Recorded session review | 143 | e2e | — |
| 147 | Interview collaborative notes | NOT_STARTED | Real-time shared notes | 140 | e2e | — |
| 148 | Interview question bank | NOT_STARTED | Reusable question sets | 136 | unit | — |
| 149 | Interview evaluation rubric | NOT_STARTED | Configurable criteria | 139 | unit | — |
| 150 | Interview panel mode | NOT_STARTED | Multiple interviewers | 140 | e2e | — |
| 151 | Interview waiting room | NOT_STARTED | Pre-join lobby | 140 | e2e | — |
| 152 | Interview time tracking | NOT_STARTED | Duration per section | 138 | unit | — |
| 153 | Interview sandbox mode | IN_PROGRESS | Demo-safe tokens | 136 | unit | `demo.rs` |
| 154 | Interview accessibility | NOT_STARTED | Captions, keyboard nav | 140 | e2e | — |
| 155 | Interview analytics | NOT_STARTED | Duration, completion rate | 138 | unit | — |

## Billing & Subscriptions (156–175)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 156 | List subscription plans | DONE | Public plans with features | — | unit | `billing.rs` |
| 157 | Create subscription | DONE | Stripe checkout, idempotent | 156 | unit, integration | `billing.rs` |
| 158 | Update subscription | DONE | Plan change, proration | 157 | unit | `billing.rs` |
| 159 | Usage metering | DONE | Track usage per org | 157 | unit | `billing.rs` |
| 160 | Stripe webhook handling | DONE | Signature verification, idempotent | 157 | integration | `billing.rs` |
| 161 | Subscription cancellation | NOT_STARTED | Cancel at period end | 157 | integration | — |
| 162 | Invoice history | NOT_STARTED | List past invoices | 157 | unit | `invoices` |
| 163 | Payment method management | NOT_STARTED | Add/remove cards | 157 | integration | — |
| 164 | Entitlement enforcement | NOT_STARTED | Feature gating by plan | 157 | integration | `entitlements` |
| 165 | Billing portal (UI) | NOT_STARTED | Plan selection, usage view | 156 | e2e | — |
| 166 | Billing sandbox mode | IN_PROGRESS | Demo-safe, no real charges | 157 | integration | `demo.rs` |
| 167 | Usage alerts | NOT_STARTED | Threshold notifications | 159 | integration | — |
| 168 | Billing admin dashboard | NOT_STARTED | Revenue metrics | 157 | e2e | — |
| 169 | Coupon/discount codes | NOT_STARTED | Stripe coupons | 157 | integration | — |
| 170 | Trial period management | NOT_STARTED | Free trial with auto-convert | 157 | integration | — |
| 171 | Billing email receipts | NOT_STARTED | Invoice emails | 160 | integration | — |
| 172 | Multi-currency support | NOT_STARTED | Currency per org | 157 | unit | — |
| 173 | Billing audit trail | DONE | All payment events logged | 160 | unit | `payment_events` |
| 174 | Subscription pause | NOT_STARTED | Temporary pause | 157 | integration | — |
| 175 | Revenue recognition | NOT_STARTED | Deferred revenue tracking | 157 | unit | — |

## Keyboard & Command (176–190)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 176 | Command palette (⌘K) | DONE | Open/close, search, navigate | — | e2e | `command-palette-wrapper.tsx` |
| 177 | Sequence shortcuts (G then X) | DONE | G+C, G+J, G+M, G+S, etc. | — | unit | `keyboard-engine.ts` |
| 178 | Combo shortcuts (Shift+X) | DONE | Shift+A/D/R for meetings | — | unit | `keyboard-engine.ts` |
| 179 | Shortcut help overlay (?) | DONE | Toggle with ?, grouped by scope | 177 | e2e | `shortcut-help-overlay.tsx` |
| 180 | Shortcut conflict detection | DONE | Detect exact/prefix collisions | 177 | unit | `keyboard-engine.ts` |
| 181 | User-customizable bindings | IN_PROGRESS | Server-stored profiles | 177 | unit, integration | `shortcuts.rs` |
| 182 | Shortcut telemetry events | DONE | Track usage per action | 177 | unit | `keyboard-engine.ts` |
| 183 | Scope-aware bindings | DONE | Global/page/modal scopes | 177 | unit | `keyboard-engine.ts` |
| 184 | Shortcut settings UI | NOT_STARTED | Edit bindings, reset defaults | 181 | e2e | — |
| 185 | Command palette actions | IN_PROGRESS | Navigation + contextual actions | 176 | e2e | — |
| 186 | Command palette recent | NOT_STARTED | Recent commands list | 176 | unit | — |
| 187 | Command palette fuzzy search | NOT_STARTED | Fuzzy matching | 176 | unit | — |
| 188 | Shortcut cheat sheet (print) | NOT_STARTED | Printable reference | 179 | unit | — |
| 189 | Vim-style navigation | NOT_STARTED | J/K for list navigation | 177 | e2e | — |
| 190 | Focus trap management | NOT_STARTED | Modal focus trapping | 183 | e2e | — |

## Demo / Sandbox (191–210)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 191 | Demo entry page | DONE | Role selection, no signup | — | e2e | `demo/page.tsx` |
| 192 | Demo session creation | DONE | Org+user+seed, JWT issued | — | integration | `demo.rs` |
| 193 | Demo seed data | DONE | Companies, jobs, candidates, apps, chat, meetings | 192 | integration | `demo.rs` |
| 194 | Demo reset engine | DONE | Manual reset, re-seed | 192 | integration | `demo.rs` |
| 195 | Demo TTL auto-expiry | NOT_STARTED | Background job cleanup | 192 | integration | — |
| 196 | Demo inactivity reset | NOT_STARTED | Reset after 30min idle | 192 | integration | — |
| 197 | Demo watermark/banner | DONE | Persistent banner, DEMO watermark | 192 | e2e | `demo-banner.tsx` |
| 198 | Demo action tracking | DONE | Track feature interactions | 192 | unit | `demo.rs` |
| 199 | Demo analytics dashboard | NOT_STARTED | Action summary per role | 198 | e2e | — |
| 200 | Demo rate limiting | IN_PROGRESS | IP-based rate limits | 192 | integration | `demo_rate_limits` |
| 201 | Demo billing sandbox | IN_PROGRESS | Sandbox Stripe mode | 192, 166 | integration | — |
| 202 | Demo interview sandbox | IN_PROGRESS | Synthetic video tokens | 192, 153 | integration | — |
| 203 | Demo email suppression | NOT_STARTED | No outbound email in demo | 192 | integration | — |
| 204 | Demo webhook suppression | NOT_STARTED | No outbound webhooks | 192 | integration | — |
| 205 | Demo candidate flow | NOT_STARTED | Full candidate journey | 192, 021 | e2e | — |
| 206 | Demo employer flow | NOT_STARTED | Full employer journey | 192, 041 | e2e | — |
| 207 | Demo agency flow | NOT_STARTED | Multi-company management | 192, 050 | e2e | — |
| 208 | Demo feature flags | DONE | 4 demo flags configured | 192 | unit | `flags.rs` |
| 209 | Demo security isolation | DONE | Sandbox tenant segregation | 192, 012 | security | `demo.rs` |
| 210 | Demo abuse protection | IN_PROGRESS | Rate limits, session limits | 200 | security | — |

## Search & Discovery (211–220)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 211 | Global search | NOT_STARTED | Cross-entity search | 026, 057, 100 | integration | — |
| 212 | Search suggestions | NOT_STARTED | Typeahead suggestions | 211 | unit | — |
| 213 | Search filters | NOT_STARTED | Faceted filtering | 211 | unit | — |
| 214 | Search results ranking | NOT_STARTED | Relevance scoring | 211 | unit | — |
| 215 | Saved searches | NOT_STARTED | Save and rerun | 211 | unit | — |
| 216 | Search analytics | NOT_STARTED | Query tracking | 211 | unit | — |
| 217 | Search index optimization | NOT_STARTED | Materialized views | 211 | unit | — |
| 218 | Boolean search operators | NOT_STARTED | AND/OR/NOT | 211 | unit | — |
| 219 | Location-based search | NOT_STARTED | Geo filtering | 211 | unit | — |
| 220 | Search export | NOT_STARTED | Export results | 211 | integration | — |

## Notifications (221–230)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 221 | In-app notifications | NOT_STARTED | Bell icon, unread count | — | e2e | — |
| 222 | Email notifications | NOT_STARTED | Transactional emails | — | integration | — |
| 223 | Push notifications | NOT_STARTED | Web push | — | integration | — |
| 224 | Notification preferences | NOT_STARTED | Per-type opt-in/out | 221 | unit | — |
| 225 | Notification templates | NOT_STARTED | Configurable templates | 222 | unit | — |
| 226 | Notification batching | NOT_STARTED | Digest mode | 222 | integration | — |
| 227 | Notification history | NOT_STARTED | Past notifications list | 221 | unit | — |
| 228 | Notification actions | NOT_STARTED | Actionable notifications | 221 | e2e | — |
| 229 | Notification sound | NOT_STARTED | Audio alerts | 221 | unit | — |
| 230 | Notification analytics | NOT_STARTED | Open/click rates | 222 | unit | — |

## Audit & Compliance (231–240)

| ID | Feature | Status | Acceptance Criteria | Dependencies | Tests | Artifacts |
|----|---------|--------|-------------------|--------------|-------|-----------|
| 231 | Audit event logging | DONE | All mutations logged | — | unit | `audit_events` table |
| 232 | Audit log viewer (UI) | NOT_STARTED | Filterable audit trail | 231 | e2e | — |
| 233 | Audit log export | NOT_STARTED | CSV/JSON export | 231 | integration | — |
| 234 | Data retention policies | NOT_STARTED | Configurable retention | 231 | integration | — |
| 235 | GDPR right to erasure | NOT_STARTED | Data deletion workflow | 015 | integration | — |
| 236 | GDPR data portability | NOT_STARTED | Full data export | 035 | integration | — |
| 237 | SOC2 compliance controls | NOT_STARTED | Access logging, encryption | 231 | security | — |
| 238 | IP allowlisting | NOT_STARTED | Org-level IP restrictions | 008 | integration | — |
| 239 | Compliance dashboard | NOT_STARTED | Compliance status overview | 231 | e2e | — |
| 240 | Incident response playbook | NOT_STARTED | Documented procedures | — | — | docs |

---

## Summary

| Status | Count |
|--------|-------|
| DONE | 68 |
| IN_PROGRESS | 22 |
| NOT_STARTED | 148 |
| BLOCKED | 0 |
| **Total** | **240** |
