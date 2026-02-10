# EmploymentX — Observability & SLO Dashboard Specification

Version: 1.0.0
Date: 2026-02-09

---

## 1. Observability Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Tracing** | OpenTelemetry SDK + OTLP exporter | Distributed request tracing |
| **Error tracking** | Sentry | Exception capture, breadcrumbs, user context |
| **Logging** | `tracing` crate + JSON formatter | Structured application logs |
| **Metrics** | OpenTelemetry Metrics (planned) | Request latency, error rates, queue depth |

## 2. Trace Context

Every request carries:
- `request_id` — Unique per-request (UUID, injected by middleware)
- `trace_id` — OpenTelemetry trace ID (propagated via W3C Trace Context)
- `span_id` — Current span within the trace
- `tenant_id` — Organization ID from JWT claims
- `user_id` — Authenticated user ID

### Span Attributes

```rust
span.set_attribute("tenant_id", tenant_id.to_string());
span.set_attribute("user_id", user_id.to_string());
span.set_attribute("request_id", request_id.to_string());
span.set_attribute("http.method", method);
span.set_attribute("http.route", route);
span.set_attribute("http.status_code", status);
```

## 3. Structured Logging

All logs are JSON-formatted with consistent fields:

```json
{
  "timestamp": "2026-02-09T19:34:00Z",
  "level": "INFO",
  "message": "Meeting accepted",
  "request_id": "req_abc123",
  "tenant_id": "org_def456",
  "user_id": "usr_ghi789",
  "module": "scheduling",
  "meeting_id": "mtg_jkl012",
  "duration_ms": 45
}
```

### Log Levels

| Level | Usage |
|-------|-------|
| ERROR | Unrecoverable failures, 5xx responses |
| WARN | Degraded behavior, retries, rate limits hit |
| INFO | Business events (meeting accepted, user registered, etc.) |
| DEBUG | Detailed execution flow (SQL queries, cache lookups) |
| TRACE | Very verbose (request/response bodies, middleware steps) |

## 4. Sentry Integration

Configuration:
```rust
let _guard = sentry::init(sentry::ClientOptions {
    dsn: config.sentry_dsn.clone(),
    environment: Some(config.environment.clone().into()),
    release: Some(env!("CARGO_PKG_VERSION").into()),
    traces_sample_rate: if config.is_production() { 0.1 } else { 1.0 },
    ..Default::default()
});
```

Captured:
- All `AppError::Internal` variants
- Unhandled panics
- Breadcrumbs for request lifecycle
- User context (ID, email, org)

## 5. Service Level Objectives (SLOs)

### 5.1 Availability

| Service | Target | Measurement |
|---------|--------|-------------|
| API (overall) | 99.9% | Successful responses / total requests |
| Auth endpoints | 99.95% | Login/register success rate |
| Chat delivery | 99.9% | Messages delivered within 5s |
| Meeting operations | 99.9% | Accept/deny/reschedule success rate |

### 5.2 Latency

| Endpoint Category | p50 | p95 | p99 |
|-------------------|-----|-----|-----|
| Auth (login/register) | 100ms | 300ms | 500ms |
| List endpoints | 50ms | 200ms | 500ms |
| Detail endpoints | 30ms | 100ms | 300ms |
| Write endpoints | 100ms | 500ms | 1000ms |
| Search endpoints | 100ms | 500ms | 1500ms |

### 5.3 Error Budget

- Monthly error budget: 0.1% of requests (43.2 minutes of downtime equivalent)
- Alert at 50% budget consumed
- Freeze non-critical deploys at 80% budget consumed

## 6. Dashboard Panels

### 6.1 Overview Dashboard

- Request rate (RPM) by endpoint category
- Error rate (%) with 5xx breakdown
- p50/p95/p99 latency
- Active users (authenticated sessions)
- Active demo sessions

### 6.2 Business Metrics Dashboard

- New registrations per day
- Active job posts
- Applications submitted
- Meetings scheduled/accepted/denied
- Messages sent
- Demo sessions started per role

### 6.3 Infrastructure Dashboard

- PostgreSQL connection pool utilization
- Redis memory usage and hit rate
- Background job queue depth
- Reminder delivery success rate
- Idempotency cache hit rate

### 6.4 SLO Dashboard

- Availability SLI vs SLO (rolling 30 days)
- Latency SLI vs SLO per category
- Error budget remaining (%)
- Error budget burn rate

## 7. Alerting Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High error rate | 5xx > 1% for 5 min | P1 | Page on-call |
| Latency spike | p95 > 2x target for 10 min | P2 | Notify channel |
| DB connection exhaustion | Pool > 80% for 5 min | P1 | Page on-call |
| Redis unavailable | Connection failures > 0 for 2 min | P1 | Page on-call |
| Reminder backlog | Pending reminders > 1000 | P2 | Notify channel |
| Error budget < 20% | Monthly budget consumed | P2 | Freeze deploys |
| Demo abuse | > 100 demo sessions from single IP/hour | P3 | Auto-block |
