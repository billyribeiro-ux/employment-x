# EmploymentX — DB DDL & Index Strategy

Version: 1.0.0
Date: 2026-02-09

---

## 1. Schema Overview

| Domain | Tables | Key Indexes |
|--------|--------|-------------|
| Identity/Tenancy | `users`, `organizations`, `organization_members`, `roles`, `permissions`, `sessions` | `users(email)`, `org_members(org_id, user_id)` |
| Candidate | `candidate_profiles`, `candidate_profile_versions`, `candidate_documents`, `candidate_skills` | `profiles(user_id)`, `skills(profile_id, skill_name)` |
| Employer | `companies`, `employer_profiles` | `companies(org_id)`, `employer_profiles(user_id)` |
| Jobs | `job_posts`, `job_post_versions` | `jobs(org_id, status)`, `jobs(org_id, created_at)` |
| Applications | `applications`, `application_stage_events`, `scorecards`, `decision_records` | `apps(org_id, job_id)`, `apps(org_id, candidate_id)`, `stage_events(app_id)` |
| Chat | `conversations`, `conversation_participants`, `messages`, `message_receipts`, `message_attachments`, `message_edits`, `message_reactions` | `messages(conv_id, created_at)`, `participants(conv_id, user_id)` |
| Scheduling | `meeting_requests`, `meeting_participants`, `meeting_availability_blocks`, `meeting_status_events`, `meeting_reschedule_events`, `reminder_jobs`, `reminder_delivery_events` | `meetings(org_id, status)`, `reminders(status, scheduled_at)` |
| Interview | `video_rooms`, `video_room_tokens`, `video_sessions`, `video_session_participants`, `video_session_events`, `pip_session_states` | `rooms(org_id)`, `tokens(room_id, user_id)` |
| Billing | `plans`, `plan_features`, `subscriptions`, `subscription_items`, `usage_meters`, `invoices`, `payment_events`, `entitlements` | `subs(org_id)`, `usage(org_id, period)` |
| Reliability | `idempotency_keys`, `audit_events`, `security_events`, `notification_events`, `consents`, `deletion_requests` | `idempotency(key_hash)`, `audit(org_id, created_at)` |
| Shortcuts | `shortcut_profiles`, `shortcut_bindings`, `shortcut_usage_events`, `command_palette_events` | `profiles(user_id)`, `usage(user_id, action)` |
| Demo | `demo_sessions`, `demo_resets`, `demo_seed_versions`, `demo_action_events`, `demo_rate_limits` | `sessions(token)`, `actions(session_id, created_at)` |

## 2. Primary Key Strategy

All tables use **UUID v7** (time-ordered) as primary keys via `Uuid::now_v7()`. Benefits:
- Globally unique without coordination
- Time-ordered for efficient B-tree insertion
- No sequential ID enumeration attacks

## 3. Index Categories

### 3.1 Foreign Key Indexes
Every foreign key column is indexed. PostgreSQL does not auto-index FK columns.

### 3.2 Tenant-Scoped Composite Indexes
Pattern: `(organization_id, <sort_column>)` for all listing queries.

```sql
CREATE INDEX idx_job_posts_org_created ON job_posts (organization_id, created_at DESC);
CREATE INDEX idx_applications_org_job ON applications (organization_id, job_id);
CREATE INDEX idx_messages_conv_created ON messages (conversation_id, created_at);
```

### 3.3 Partial Indexes
Used for filtered queries on status columns:

```sql
CREATE INDEX idx_job_posts_published ON job_posts (organization_id, published_at)
  WHERE status = 'published';
CREATE INDEX idx_demo_sessions_active ON demo_sessions (session_token)
  WHERE is_active = true;
CREATE INDEX idx_reminder_jobs_pending ON reminder_jobs (scheduled_at)
  WHERE status = 'pending';
```

### 3.4 Unique Constraints
```sql
UNIQUE (email) ON users
UNIQUE (organization_id, slug) ON organizations
UNIQUE (key_hash) ON idempotency_keys
UNIQUE (conversation_id, user_id) ON conversation_participants
UNIQUE (ip_address, endpoint, window_start) ON demo_rate_limits
```

### 3.5 Full-Text Search (Planned)
```sql
ALTER TABLE job_posts ADD COLUMN search_vector tsvector;
CREATE INDEX idx_job_posts_search ON job_posts USING GIN (search_vector);
```

## 4. Migration Discipline

- **Forward-only**: No down migrations in production
- **Versioned filenames**: `YYYYMMDDHHMMSS_description.sql`
- **CI validation**: Every PR runs migrations against a fresh test database
- **Rollback**: Via compensating migrations (new migration that reverses changes)
- **Lock safety**: All DDL uses `CONCURRENTLY` for index creation on large tables

## 5. Data Integrity

- **CHECK constraints**: Status enums, role values, positive amounts
- **Foreign keys**: `ON DELETE CASCADE` for child records, `ON DELETE RESTRICT` for critical references
- **NOT NULL**: Default for all columns unless explicitly nullable
- **Optimistic concurrency**: `version` column on mutable entities, `WHERE version = $expected` on updates
- **Timestamps**: `created_at` and `updated_at` on all tables, `updated_at` set via application code
