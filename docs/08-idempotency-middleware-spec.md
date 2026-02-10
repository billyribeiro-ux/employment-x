# EmploymentX — Idempotency Middleware Specification

Version: 1.0.0
Date: 2026-02-09

---

## 1. Purpose

Prevent duplicate processing of critical write operations. Required on:
- Meeting accept/deny/reschedule
- Application stage transitions
- Hiring decisions
- Subscription creation/update
- Webhook processing
- Job applications

## 2. Architecture

```
Client Request
  │
  ▼
┌─────────────────────────┐
│  Idempotency Middleware  │
│                         │
│  1. Extract key from    │
│     Idempotency-Key     │
│     header              │
│                         │
│  2. Compute fingerprint │
│     SHA-256(key + path  │
│     + method + body)    │
│                         │
│  3. Check Redis cache   │
│     ├─ HIT → return     │
│     │   cached response │
│     ├─ LOCKED → 409     │
│     └─ MISS → continue  │
│                         │
│  4. Set Redis lock      │
│     (60s TTL)           │
│                         │
│  5. Execute handler     │
│                         │
│  6. Cache response      │
│     (24h TTL)           │
│                         │
│  7. Release lock        │
└─────────────────────────┘
```

## 3. Fingerprint Computation

```rust
fn compute_fingerprint(key: &str, method: &str, path: &str, body: &[u8]) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    hasher.update(b"|");
    hasher.update(method.as_bytes());
    hasher.update(b"|");
    hasher.update(path.as_bytes());
    hasher.update(b"|");
    hasher.update(body);
    format!("idempotency:{:x}", hasher.finalize())
}
```

## 4. Redis Key Structure

```
idempotency:{fingerprint_hex}:lock    → "1"           TTL: 60s
idempotency:{fingerprint_hex}:resp    → JSON response  TTL: 24h
```

## 5. Response Caching

Cached response includes:
```json
{
  "status_code": 201,
  "headers": { "content-type": "application/json" },
  "body": "{...}"
}
```

## 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| No `Idempotency-Key` header | Middleware skipped, request processed normally |
| Cache hit (same fingerprint) | Return cached response, HTTP 200 |
| Lock exists (concurrent request) | Return HTTP 409 Conflict |
| Handler error | Do NOT cache error responses; release lock |
| Redis unavailable | Log warning, proceed without idempotency (fail-open) |

## 7. Database Backup Store

For audit and long-term deduplication, fingerprints are also stored in PostgreSQL:

```sql
idempotency_keys:
  id UUID PK
  key_hash VARCHAR(64) UNIQUE
  http_method VARCHAR(10)
  http_path VARCHAR(500)
  response_status INT
  response_body JSONB
  created_at TIMESTAMPTZ
  expires_at TIMESTAMPTZ
```

Background cleanup job removes expired entries daily.

## 8. Client Contract

- Clients MUST generate a unique UUID for each logical operation
- Retries of the same operation MUST use the same `Idempotency-Key`
- Different operations MUST use different keys
- Keys are scoped per-user (same key from different users = different fingerprints due to auth context)

## 9. Monitoring

Metrics emitted:
- `idempotency.cache_hit` — Counter of cache hits
- `idempotency.cache_miss` — Counter of cache misses
- `idempotency.conflict` — Counter of concurrent conflicts (409s)
- `idempotency.redis_error` — Counter of Redis failures (fail-open events)
