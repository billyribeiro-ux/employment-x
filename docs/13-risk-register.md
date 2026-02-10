# EmploymentX — Risk Register & Mitigation Playbooks

Version: 1.0.0
Date: 2026-02-09

---

## Risk Severity Matrix

| Impact \ Likelihood | Low | Medium | High |
|---------------------|-----|--------|------|
| **High** | Medium | High | Critical |
| **Medium** | Low | Medium | High |
| **Low** | Low | Low | Medium |

---

## Risk Register

### R001: Database Connection Exhaustion
- **Severity**: Critical
- **Likelihood**: Medium
- **Impact**: API becomes unresponsive, all requests fail
- **Mitigation**:
  1. Connection pool with max 20 connections, min 5 idle
  2. Statement timeout of 30 seconds
  3. Monitoring alert at 80% pool utilization
  4. Circuit breaker on repeated connection failures
- **Playbook**:
  1. Alert fires → check active connections (`pg_stat_activity`)
  2. Identify long-running queries → terminate if safe
  3. If pool exhausted → restart API pods (rolling)
  4. If persistent → increase pool size or add read replicas

### R002: Redis Unavailability
- **Severity**: High
- **Likelihood**: Low
- **Impact**: Idempotency disabled (fail-open), rate limiting disabled, cache miss storm
- **Mitigation**:
  1. Redis Sentinel or managed Redis with automatic failover
  2. Idempotency middleware fails open (logs warning, processes request)
  3. Rate limiting falls back to in-memory sliding window
  4. Monitoring alert on connection failures
- **Playbook**:
  1. Alert fires → check Redis health
  2. If managed → check provider status page
  3. If self-hosted → check Sentinel, promote replica
  4. Monitor for duplicate processing during outage

### R003: Cross-Tenant Data Leak
- **Severity**: Critical
- **Likelihood**: Low
- **Impact**: Organization A sees Organization B data — trust violation, legal exposure
- **Mitigation**:
  1. Tenant middleware enforces `organization_id` on every query
  2. Integration tests verify isolation on all endpoints
  3. Security tests attempt cross-tenant access
  4. Row-level security (RLS) as defense-in-depth (planned)
  5. Audit logging on all data access
- **Playbook**:
  1. Incident detected → immediately disable affected endpoint
  2. Identify scope of exposure (which orgs, which data)
  3. Notify affected organizations within 24 hours
  4. Root cause analysis → fix → deploy → verify
  5. Post-incident review with timeline

### R004: JWT Secret Compromise
- **Severity**: Critical
- **Likelihood**: Low
- **Impact**: Attacker can forge tokens, impersonate any user
- **Mitigation**:
  1. Secret stored in Vault/Secrets Manager, never in code
  2. Secret rotation capability (accept old + new during transition)
  3. Short token TTL (1 hour access, 7 day refresh)
  4. Token blacklist on logout
- **Playbook**:
  1. Rotate JWT secret immediately
  2. Invalidate all existing sessions
  3. Force re-authentication for all users
  4. Audit access logs for suspicious activity
  5. Investigate how secret was exposed

### R005: Stripe Webhook Spoofing
- **Severity**: High
- **Likelihood**: Medium
- **Impact**: Fake subscription activations, billing manipulation
- **Mitigation**:
  1. Stripe signature verification on all webhooks
  2. Idempotency on webhook processing
  3. Webhook endpoint not publicly documented
  4. Rate limiting on webhook endpoint
- **Playbook**:
  1. Alert on signature verification failures
  2. If sustained → temporarily disable webhook endpoint
  3. Verify Stripe webhook secret hasn't been compromised
  4. Rotate webhook secret in Stripe dashboard
  5. Re-enable and monitor

### R006: Demo Abuse / Resource Exhaustion
- **Severity**: Medium
- **Likelihood**: High
- **Impact**: Database bloat, API slowdown from demo data
- **Mitigation**:
  1. Rate limiting on demo endpoints (IP-based)
  2. Session TTL (2 hours) with auto-cleanup
  3. Max 10 concurrent demo sessions per IP
  4. Background job cleans expired sessions every 15 minutes
  5. Demo data in separate tenant (no impact on real data)
- **Playbook**:
  1. Monitor demo session count and DB size
  2. If abuse detected → block IP, increase rate limits
  3. If DB bloat → run manual cleanup job
  4. If persistent → add CAPTCHA to demo entry

### R007: Migration Failure in Production
- **Severity**: High
- **Likelihood**: Medium
- **Impact**: Schema inconsistency, potential data loss
- **Mitigation**:
  1. All migrations tested in CI against fresh database
  2. Migrations run in transaction where possible
  3. Compensating migration prepared before deploy
  4. Database backup before every migration
  5. Forward-only migrations (no down migrations)
- **Playbook**:
  1. Migration fails → do NOT retry automatically
  2. Check migration state (`sqlx migrate info`)
  3. If partial → apply compensating migration
  4. If clean failure → fix migration, re-run
  5. Restore from backup as last resort

### R008: Third-Party Service Outage (Stripe, Sentry, Email)
- **Severity**: Medium
- **Likelihood**: Medium
- **Impact**: Billing operations fail, error tracking blind, notifications delayed
- **Mitigation**:
  1. Stripe: Queue failed webhook retries, Stripe auto-retries
  2. Sentry: Application continues without error tracking
  3. Email: Queue messages for retry, exponential backoff
  4. All external calls have timeouts (5s default)
  5. Circuit breaker on repeated failures
- **Playbook**:
  1. Check provider status page
  2. If Stripe down → queue billing operations, process when restored
  3. If email down → queue notifications, alert users of delay
  4. Monitor recovery and process queued items

### R009: Performance Degradation Under Load
- **Severity**: High
- **Likelihood**: Medium
- **Impact**: Slow responses, timeout errors, poor user experience
- **Mitigation**:
  1. Connection pooling (DB + Redis)
  2. Query optimization with EXPLAIN ANALYZE
  3. Pagination on all list endpoints
  4. Response compression (gzip)
  5. CDN for static assets
  6. Horizontal scaling capability
- **Playbook**:
  1. Identify slow endpoints via latency dashboard
  2. Check for N+1 queries, missing indexes
  3. Add indexes or optimize queries
  4. If load-related → scale horizontally
  5. If query-related → add caching layer

### R010: Data Loss
- **Severity**: Critical
- **Likelihood**: Low
- **Impact**: Irrecoverable loss of customer data
- **Mitigation**:
  1. Managed database with automated daily backups
  2. Point-in-time recovery (PITR) enabled
  3. Cross-region backup replication (planned)
  4. Soft deletes on critical entities
  5. Audit trail for all mutations
- **Playbook**:
  1. Identify scope of data loss
  2. Stop writes to affected tables
  3. Restore from most recent backup / PITR
  4. Verify data integrity
  5. Notify affected users
  6. Post-incident review

---

## Risk Review Cadence

- **Weekly**: Review open risks, update likelihood/impact
- **Per-sprint**: Add new risks from retrospective
- **Per-incident**: Update playbooks with lessons learned
- **Quarterly**: Full risk register review with stakeholders
