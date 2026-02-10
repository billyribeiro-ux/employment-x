# EmploymentX — API Contracts & Error Model

Version: 1.0.0
Date: 2026-02-09

---

## 1. API Design Principles

- RESTful resource-oriented URLs under `/v1/`
- JSON request/response bodies
- Bearer token authentication on protected routes
- Consistent error envelope
- Cursor-based pagination
- Idempotency-Key header on critical writes

## 2. Authentication

```
POST /v1/auth/register   { email, password, first_name, last_name, role }
POST /v1/auth/login      { email, password }
POST /v1/auth/logout     (protected)
GET  /v1/me              (protected)
```

## 3. Resource Endpoints

### Candidates
```
GET    /v1/candidates              List (paginated, org-scoped)
POST   /v1/candidates              Create profile
GET    /v1/candidates/:id          Get by ID
PATCH  /v1/candidates/:id          Update profile
POST   /v1/candidates/:id/documents  Upload document
```

### Employers
```
GET    /v1/companies               List companies
POST   /v1/companies               Create company
PATCH  /v1/companies/:id           Update company
GET    /v1/employers/me            Get my employer profile
```

### Jobs
```
GET    /v1/jobs                    List job posts
POST   /v1/jobs                    Create job post
GET    /v1/jobs/:id                Get job post
PATCH  /v1/jobs/:id                Update job post
```

### Applications
```
POST   /v1/jobs/:id/apply          Apply to job (idempotent)
GET    /v1/applications/:id        Get application
POST   /v1/applications/:id/stage  Transition stage (idempotent)
POST   /v1/applications/:id/decision  Create decision (idempotent)
```

### Chat
```
GET    /v1/conversations           List conversations
POST   /v1/conversations           Create conversation
GET    /v1/conversations/:id/messages  Get messages
POST   /v1/conversations/:id/messages  Send message
POST   /v1/conversations/:id/read     Mark as read
POST   /v1/conversations/:id/attachments  Upload attachment
```

### Scheduling
```
POST   /v1/meetings/request        Create meeting request (idempotent)
POST   /v1/meetings/:id/accept     Accept meeting (idempotent)
POST   /v1/meetings/:id/deny       Deny meeting (idempotent)
POST   /v1/meetings/:id/reschedule Reschedule meeting (idempotent)
GET    /v1/meetings/:id            Get meeting
GET    /v1/meetings                List meetings
```

### Interviews
```
POST   /v1/interviews/rooms                 Create room
POST   /v1/interviews/rooms/:id/token       Generate token
POST   /v1/interviews/sessions/:id/events   Send event
POST   /v1/interviews/sessions/:id/feedback Submit feedback
```

### Billing
```
GET    /v1/billing/plans                     List plans
POST   /v1/billing/subscriptions             Create subscription (idempotent)
PATCH  /v1/billing/subscriptions/:id         Update subscription
GET    /v1/billing/usage                     Get usage meters
POST   /v1/billing/webhooks/stripe           Stripe webhook (idempotent)
```

### Shortcuts
```
GET    /v1/shortcuts                Get shortcut profile
PATCH  /v1/shortcuts                Update bindings
POST   /v1/shortcuts/usage-events   Track usage
```

### Feature Flags
```
GET    /v1/flags                    Get all flags
```

### Demo
```
POST   /v1/demo/start                       Start demo session
POST   /v1/demo/:session_id/reset           Reset demo
POST   /v1/demo/:session_id/actions          Track demo action
GET    /v1/demo/:session_id/analytics        Get demo analytics
```

## 4. Error Model

### Error Envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "request_id": "req_7f3a...",
    "details": {
      "field": "email",
      "reason": "already_exists"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions or wrong tenant |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource or idempotency conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Idempotency

Critical write endpoints accept `Idempotency-Key` header. Behavior:
1. First request: Process normally, cache response in Redis (24h TTL)
2. Duplicate request (same key): Return cached response, HTTP 200
3. Concurrent duplicate: Return HTTP 409 Conflict

## 5. Pagination

Cursor-based pagination using `cursor` and `limit` query parameters:

```
GET /v1/candidates?limit=20&cursor=eyJpZCI6IjEyMyJ9

Response:
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6IjE0MyJ9",
    "has_more": true
  }
}
```

## 6. Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Protected routes | `Bearer <jwt>` |
| `Content-Type` | POST/PATCH | `application/json` |
| `Idempotency-Key` | Critical writes | UUID for deduplication |
| `X-Request-Id` | Optional | Client-provided request ID (auto-generated if missing) |
