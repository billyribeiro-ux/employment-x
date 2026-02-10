-- EmploymentX Video Interview Infrastructure
-- Migration: 20240101000003_video_interview_infra

-- Add provider_room_name to video_rooms
ALTER TABLE video_rooms ADD COLUMN IF NOT EXISTS provider_room_name VARCHAR(500);
CREATE INDEX IF NOT EXISTS idx_video_rooms_provider_name ON video_rooms (provider_room_name) WHERE provider_room_name IS NOT NULL;

-- Add join window columns to meeting_requests
ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS join_window_open_at TIMESTAMPTZ;
ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS join_window_close_at TIMESTAMPTZ;
ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS provider_room_name VARCHAR(500);

-- Add attendance tracking to meeting_participants
ALTER TABLE meeting_participants ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(50) DEFAULT 'invited'
  CHECK (attendance_status IN ('invited', 'joined', 'left', 'no_show'));
ALTER TABLE meeting_participants ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;
ALTER TABLE meeting_participants ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

-- Meeting events table (audit trail for video/meeting lifecycle)
CREATE TABLE IF NOT EXISTS meeting_events (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meeting_requests(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    correlation_id VARCHAR(255),
    payload_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meeting_events_meeting ON meeting_events (meeting_id, created_at);
CREATE INDEX IF NOT EXISTS idx_meeting_events_type ON meeting_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_meeting_events_org ON meeting_events (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_meeting_events_correlation ON meeting_events (correlation_id) WHERE correlation_id IS NOT NULL;

-- Idempotency keys table (if not already present from initial migration)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    scope VARCHAR(100) NOT NULL,
    http_method VARCHAR(10),
    http_path VARCHAR(500),
    response_status INT,
    response_body JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope ON idempotency_keys (scope, expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys (expires_at);

-- Backfill join windows for existing meetings (30 min before to 30 min after scheduled time)
UPDATE meeting_requests
SET join_window_open_at = created_at - INTERVAL '30 minutes',
    join_window_close_at = created_at + INTERVAL '90 minutes'
WHERE join_window_open_at IS NULL;
