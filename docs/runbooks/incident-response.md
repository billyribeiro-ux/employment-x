# Incident Response Runbook

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| SEV-1 | Service down, data loss risk | 15 min | DB unreachable, auth broken, tenant leak |
| SEV-2 | Major feature broken | 1 hour | Billing failures, job posting broken |
| SEV-3 | Minor feature degraded | 4 hours | Slow search, notification delays |
| SEV-4 | Cosmetic / low impact | Next sprint | UI glitch, minor text error |

## SEV-1 Playbook

1. **Acknowledge** — Post in #incidents channel within 5 min
2. **Assess** — Check health endpoint: `GET /api/v1/health`
3. **Contain** — If tenant boundary leak: immediately revoke affected sessions
4. **Diagnose** — Check logs: `pino` structured logs with `correlationId`
5. **Fix** — Deploy hotfix or rollback (see rollback.md)
6. **Verify** — Run security test suite: `pnpm exec vitest run tests/security/`
7. **Postmortem** — Within 48 hours, document root cause + prevention

## Key Dashboards
- **Health**: `/api/v1/health`
- **SLO**: `/api/v1/admin/slo`
- **Audit**: `/api/v1/admin/audit-export?days=1`
- **Sentry**: Check SENTRY_DSN dashboard
- **OTel**: Check Jaeger/Grafana at OTEL_EXPORTER_OTLP_ENDPOINT

## Escalation
1. On-call engineer (PagerDuty)
2. Platform lead
3. VP Engineering (SEV-1 only)
