-- EmploymentX Demo / Sandbox Tables
-- Migration: 20240101000002_demo_tables

CREATE TABLE demo_sessions (
    id UUID PRIMARY KEY,
    role VARCHAR(50) NOT NULL CHECK (role IN ('candidate', 'employer', 'agency')),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seed_version_id UUID NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    reset_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_demo_sessions_token ON demo_sessions (session_token) WHERE is_active = true;
CREATE INDEX idx_demo_sessions_tenant ON demo_sessions (tenant_id);
CREATE INDEX idx_demo_sessions_expires ON demo_sessions (expires_at) WHERE is_active = true;

CREATE TABLE demo_resets (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    trigger VARCHAR(50) NOT NULL CHECK (trigger IN ('manual', 'ttl_expiry', 'inactivity', 'admin')),
    entities_deleted INT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_demo_resets_session ON demo_resets (session_id);

CREATE TABLE demo_seed_versions (
    id UUID PRIMARY KEY,
    version_tag VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    seed_data JSONB NOT NULL,
    entity_counts JSONB NOT NULL DEFAULT '{}',
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_demo_seed_versions_current ON demo_seed_versions (is_current) WHERE is_current = true;

CREATE TABLE demo_action_events (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_demo_action_events_session ON demo_action_events (session_id, created_at);
CREATE INDEX idx_demo_action_events_action ON demo_action_events (action, created_at);
CREATE INDEX idx_demo_action_events_role ON demo_action_events (role, action);

CREATE TABLE demo_rate_limits (
    id UUID PRIMARY KEY,
    ip_address INET NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INT NOT NULL DEFAULT 1,
    UNIQUE (ip_address, endpoint, window_start)
);
CREATE INDEX idx_demo_rate_limits_ip ON demo_rate_limits (ip_address, window_start);
