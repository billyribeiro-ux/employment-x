# Launch Gates Checklist

## Pre-Launch Gates

### Security
- [ ] Tenant isolation tests passing (19 tests)
- [ ] RBAC deny-path tests passing
- [ ] PII redaction verified
- [ ] CSRF/XSS hardening active
- [ ] Rate limiting on all auth endpoints
- [ ] Webhook signature verification
- [ ] Demo mode cannot trigger real side effects
- [ ] Session management: expiry, revocation working
- [ ] Password reset tokens single-use + expiry

### Quality
- [ ] All unit tests passing (35+)
- [ ] E2E smoke tests passing
- [ ] TypeScript strict mode — zero errors
- [ ] ESLint — zero errors
- [ ] Build — all packages green
- [ ] Prisma schema validates
- [ ] Migration safety lint passing

### Observability
- [ ] OTel traces configured
- [ ] Pino structured logging with correlation_id + tenant_id
- [ ] Sentry error tracking FE + BE
- [ ] Health endpoint: GET /api/v1/health
- [ ] SLO dashboard: GET /api/v1/admin/slo

### Infrastructure
- [ ] PostgreSQL with connection pooling
- [ ] Redis for BullMQ queues + rate limiting
- [ ] CI/CD pipeline: 8 jobs (typecheck, lint, test, build, rust, migration, security, e2e)
- [ ] Environment variables validated at boot (zod)

### Features (M1 Exit Gates)
- [ ] F-001 Registration
- [ ] F-002 Login/Logout
- [ ] F-003 Organization creation
- [ ] F-004 RBAC enforcement
- [ ] F-006 Candidate profile
- [ ] F-010 Employer profile
- [ ] F-011 Job CRUD
- [ ] F-012 Job listings
- [ ] F-013 Apply flow
- [ ] F-014 Stage transitions
- [ ] F-016 Conversations
- [ ] F-017 Messages
- [ ] F-021 Meeting requests
- [ ] F-022 Accept/deny
- [ ] F-023 Reschedule
- [ ] F-027 Billing subscription
- [ ] F-030 Reminders
- [ ] F-036 Demo scenarios
- [ ] F-151 Password reset

### Documentation
- [ ] Local setup runbook
- [ ] Incident response runbook
- [ ] Rollback runbook
- [ ] Queue failure runbook
- [ ] API docs (OpenAPI 3.0.3)
- [ ] README with feature list

## Post-Launch Verification
- [ ] Health check returns 200
- [ ] Demo sandbox creates + expires correctly
- [ ] Audit log capturing events
- [ ] Error rates below SLO threshold (< 1%)
- [ ] P95 latency below 500ms
