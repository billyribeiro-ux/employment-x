# EmploymentX — Scheduling & Reminder Engine Specification

Version: 1.0.0
Date: 2026-02-09

---

## 1. Meeting Lifecycle State Machine

```
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌──────────┐
         │ACCEPTED│ │ DENIED │ │RESCHEDULE│
         └───┬────┘ └────────┘ └────┬─────┘
             │                      │
             │                      ▼
             │                 ┌──────────┐
             │                 │ PENDING  │ (new meeting, lineage link)
             │                 └──────────┘
             ▼
        ┌──────────┐
        │COMPLETED │
        └──────────┘
```

Valid transitions:
- `pending` → `accepted` | `denied` | `rescheduled` | `cancelled`
- `accepted` → `completed` | `cancelled` | `rescheduled`
- `rescheduled` → creates new `pending` meeting with `parent_meeting_id` lineage

## 2. Accept Flow

```
1. Validate: meeting exists, status=pending, user is participant, slot is valid
2. Idempotency check (Idempotency-Key header)
3. BEGIN transaction
4. UPDATE meeting_requests SET status='accepted', accepted_slot=$slot
5. INSERT meeting_status_events (from='pending', to='accepted')
6. INSERT reminder_jobs for each participant:
   - 24 hours before
   - 1 hour before
   - 15 minutes before
7. COMMIT
8. Emit notification to all participants
9. INSERT audit_events
10. Return accepted meeting
```

## 3. Deny Flow

```
1. Validate: meeting exists, status=pending, user is participant
2. Idempotency check
3. BEGIN transaction
4. UPDATE meeting_requests SET status='denied'
5. INSERT meeting_status_events (from='pending', to='denied', reason=$reason)
6. COMMIT
7. Emit notification to requester
8. INSERT audit_events
9. Return denied meeting
```

## 4. Reschedule Flow

```
1. Validate: meeting exists, status in (pending, accepted), user is participant
2. Idempotency check
3. BEGIN transaction
4. UPDATE meeting_requests SET status='rescheduled'
5. INSERT meeting_status_events (from=$current, to='rescheduled')
6. INSERT meeting_reschedule_events (original_id, reason, new_slots)
7. UPDATE reminder_jobs SET status='cancelled' WHERE meeting_id=$id AND status='pending'
8. INSERT new meeting_requests with parent_meeting_id=$id, status='pending', new proposed_slots
9. INSERT reminder_jobs for new meeting (created on accept, not here)
10. COMMIT
11. Emit notification to all participants
12. INSERT audit_events
13. Return new pending meeting
```

## 5. Reminder Engine

### 5.1 Job Schema

```sql
reminder_jobs:
  id UUID PK
  meeting_id UUID FK
  organization_id UUID FK
  recipient_id UUID FK
  reminder_type VARCHAR  -- '24h_before', '1h_before', '15m_before'
  scheduled_at TIMESTAMPTZ
  status VARCHAR          -- 'pending', 'sent', 'failed', 'cancelled'
  attempts INT DEFAULT 0
  last_attempt_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
```

### 5.2 Processing Loop

Background Tokio task runs every 30 seconds:

```rust
loop {
    let due_reminders = sqlx::query(
        "SELECT * FROM reminder_jobs
         WHERE status = 'pending' AND scheduled_at <= NOW()
         ORDER BY scheduled_at ASC
         LIMIT 100
         FOR UPDATE SKIP LOCKED"
    ).fetch_all(&pool).await;

    for reminder in due_reminders {
        match deliver_reminder(&reminder).await {
            Ok(_) => {
                update_status(&reminder.id, "sent").await;
                insert_delivery_event(&reminder, "sent").await;
            }
            Err(e) => {
                let new_attempts = reminder.attempts + 1;
                if new_attempts >= 3 {
                    update_status(&reminder.id, "failed").await;
                    insert_delivery_event(&reminder, "failed").await;
                } else {
                    // Exponential backoff: 1min, 5min, 15min
                    let backoff = Duration::from_secs(60 * 5u64.pow(new_attempts as u32 - 1));
                    update_retry(&reminder.id, new_attempts, backoff).await;
                }
            }
        }
    }

    tokio::time::sleep(Duration::from_secs(30)).await;
}
```

### 5.3 Delivery Channels

| Channel | Implementation | Demo Mode |
|---------|---------------|-----------|
| Email | SMTP / SendGrid | Suppressed (logged only) |
| Push | Web Push API | Suppressed |
| In-app | Notification table insert | Active |

### 5.4 Cancellation

When a meeting is denied or rescheduled:
```sql
UPDATE reminder_jobs
SET status = 'cancelled', updated_at = NOW()
WHERE meeting_id = $1 AND status = 'pending'
```

## 6. Timezone Handling

- All times stored as `TIMESTAMPTZ` (UTC in database)
- Meeting requests include `timezone` field (IANA timezone string)
- API accepts ISO 8601 with timezone offset
- Frontend displays in user's local timezone
- Reminder scheduling uses UTC for job scheduling, converts for display

## 7. Availability Blocks (Planned)

```sql
meeting_availability_blocks:
  id UUID PK
  user_id UUID FK
  day_of_week INT (0=Sunday)
  start_time TIME
  end_time TIME
  timezone VARCHAR
  is_recurring BOOLEAN
  valid_from DATE
  valid_until DATE
```

Used for:
- Auto-suggesting available slots
- Conflict detection before accept
- Calendar integration sync target

## 8. Idempotency

All meeting state transitions (accept, deny, reschedule) are idempotent:
- `Idempotency-Key` header required
- SHA-256 fingerprint stored in `idempotency_keys` table
- 24-hour TTL on cached responses
- Concurrent duplicates return 409 Conflict
