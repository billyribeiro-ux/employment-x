-- EmploymentX Production Schema
-- Migration: 20240101000001_initial_schema
-- All tables are tenant-scoped where applicable

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- IDENTITY / TENANCY
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('candidate', 'employer', 'admin')),
    organization_id UUID,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_organization_id ON users (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_users_role ON users (role);

CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(255),
    logo_url TEXT,
    plan_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_organizations_slug ON organizations (slug);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'recruiter', 'hiring_manager', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);
CREATE INDEX idx_org_members_org ON organization_members (organization_id);
CREATE INDEX idx_org_members_user ON organization_members (user_id);

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

CREATE TABLE mfa_factors (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    factor_type VARCHAR(50) NOT NULL,
    secret_encrypted TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CANDIDATE / EMPLOYER
-- ============================================================

CREATE TABLE candidate_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    headline VARCHAR(255),
    summary TEXT,
    location VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url TEXT,
    portfolio_url TEXT,
    avatar_url TEXT,
    years_experience INT,
    desired_salary_min INT,
    desired_salary_max INT,
    desired_salary_currency CHAR(3),
    open_to_remote BOOLEAN NOT NULL DEFAULT FALSE,
    open_to_relocation BOOLEAN NOT NULL DEFAULT FALSE,
    availability_status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (availability_status IN ('actively_looking', 'open', 'not_looking')),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_candidate_profiles_user ON candidate_profiles (user_id);
CREATE INDEX idx_candidate_profiles_availability ON candidate_profiles (availability_status);
CREATE INDEX idx_candidate_profiles_location ON candidate_profiles (location) WHERE location IS NOT NULL;

CREATE TABLE candidate_profile_versions (
    id UUID PRIMARY KEY,
    candidate_profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    version INT NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_documents (
    id UUID PRIMARY KEY,
    candidate_profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('resume', 'cover_letter', 'portfolio', 'certification', 'other')),
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_candidate_docs_profile ON candidate_documents (candidate_profile_id);

CREATE TABLE candidate_skills (
    id UUID PRIMARY KEY,
    candidate_profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    years_experience INT,
    proficiency VARCHAR(50) CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
    UNIQUE (candidate_profile_id, name)
);
CREATE INDEX idx_candidate_skills_profile ON candidate_skills (candidate_profile_id);
CREATE INDEX idx_candidate_skills_name ON candidate_skills (name);

CREATE TABLE candidate_preferences (
    id UUID PRIMARY KEY,
    candidate_profile_id UUID NOT NULL UNIQUE REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    preferred_job_types JSONB NOT NULL DEFAULT '[]',
    preferred_locations JSONB NOT NULL DEFAULT '[]',
    preferred_industries JSONB NOT NULL DEFAULT '[]',
    min_salary INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE companies (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website TEXT,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    logo_url TEXT,
    headquarters_location VARCHAR(255),
    founded_year INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_companies_org ON companies (organization_id);

CREATE TABLE employer_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255),
    department VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_employer_profiles_org ON employer_profiles (organization_id);

-- ============================================================
-- JOBS / APPLICATIONS
-- ============================================================

CREATE TABLE job_posts (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    responsibilities TEXT,
    benefits TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'closed', 'archived')),
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('full_time', 'part_time', 'contract', 'internship', 'temporary')),
    work_location VARCHAR(50) NOT NULL CHECK (work_location IN ('remote', 'hybrid', 'onsite')),
    location VARCHAR(255),
    salary_min BIGINT,
    salary_max BIGINT,
    salary_currency CHAR(3),
    salary_period VARCHAR(50) CHECK (salary_period IN ('hourly', 'monthly', 'yearly')),
    experience_min INT,
    experience_max INT,
    department VARCHAR(255),
    hiring_manager_id UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_posts_org ON job_posts (organization_id);
CREATE INDEX idx_job_posts_company ON job_posts (company_id);
CREATE INDEX idx_job_posts_status ON job_posts (status);
CREATE INDEX idx_job_posts_published ON job_posts (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_job_posts_type_location ON job_posts (job_type, work_location);

CREATE TABLE job_post_versions (
    id UUID PRIMARY KEY,
    job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    version INT NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'applied' CHECK (current_stage IN ('applied', 'screening', 'phone_screen', 'technical_interview', 'onsite_interview', 'offer', 'hired', 'rejected', 'withdrawn')),
    cover_letter TEXT,
    resume_document_id UUID REFERENCES candidate_documents(id),
    source VARCHAR(50) CHECK (source IN ('direct', 'referral', 'sourced', 'agency')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, candidate_id)
);
CREATE INDEX idx_applications_org ON applications (organization_id);
CREATE INDEX idx_applications_job ON applications (job_id);
CREATE INDEX idx_applications_candidate ON applications (candidate_id);
CREATE INDEX idx_applications_stage ON applications (current_stage);
CREATE INDEX idx_applications_job_candidate ON applications (job_id, candidate_id);

CREATE TABLE application_stage_events (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    from_stage VARCHAR(50),
    to_stage VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_app_stage_events_app ON application_stage_events (application_id);
CREATE INDEX idx_app_stage_events_org ON application_stage_events (organization_id);

CREATE TABLE scorecards (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    interviewer_id UUID NOT NULL REFERENCES users(id),
    stage VARCHAR(50) NOT NULL,
    overall_rating INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    recommendation VARCHAR(50) NOT NULL CHECK (recommendation IN ('strong_hire', 'hire', 'no_hire', 'strong_no_hire')),
    strengths TEXT,
    weaknesses TEXT,
    notes TEXT,
    criteria_scores JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scorecards_app ON scorecards (application_id);
CREATE INDEX idx_scorecards_org ON scorecards (organization_id);

CREATE TABLE decision_records (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('hire', 'reject', 'hold')),
    decided_by UUID NOT NULL REFERENCES users(id),
    rationale TEXT NOT NULL,
    compensation_offered TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_decision_records_app ON decision_records (application_id);
CREATE INDEX idx_decision_records_org ON decision_records (organization_id);

CREATE TABLE interviewer_feedback (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    interviewer_id UUID NOT NULL REFERENCES users(id),
    overall_rating INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    recommendation VARCHAR(50) NOT NULL CHECK (recommendation IN ('strong_hire', 'hire', 'no_hire', 'strong_no_hire')),
    strengths TEXT,
    weaknesses TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_interviewer_feedback_app ON interviewer_feedback (application_id);

-- ============================================================
-- CHAT
-- ============================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    subject VARCHAR(255),
    conversation_type VARCHAR(50) NOT NULL CHECK (conversation_type IN ('direct', 'group', 'system')),
    last_message_at TIMESTAMPTZ,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conversations_org ON conversations (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_conversations_last_msg ON conversations (last_message_at DESC);

CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_conv_participants_conv ON conversation_participants (conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants (user_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    reply_to_id UUID REFERENCES messages(id),
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conv_created ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);

CREATE TABLE message_receipts (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL,
    UNIQUE (message_id, user_id)
);
CREATE INDEX idx_msg_receipts_message ON message_receipts (message_id);

CREATE TABLE message_attachments (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_msg_attachments_message ON message_attachments (message_id);

CREATE TABLE message_edits (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    previous_body TEXT NOT NULL,
    edited_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_reactions (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id, user_id, emoji)
);

-- ============================================================
-- SCHEDULING / REMINDERS
-- ============================================================

CREATE TABLE meeting_requests (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied', 'rescheduled', 'cancelled', 'completed')),
    application_id UUID REFERENCES applications(id),
    meeting_type VARCHAR(50) NOT NULL CHECK (meeting_type IN ('phone_screen', 'technical', 'behavioral', 'onsite', 'other')),
    timezone VARCHAR(100) NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
    location TEXT,
    video_room_id UUID,
    proposed_slots JSONB NOT NULL DEFAULT '[]',
    confirmed_slot JSONB,
    deny_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_meeting_requests_org ON meeting_requests (organization_id);
CREATE INDEX idx_meeting_requests_requester ON meeting_requests (requester_id);
CREATE INDEX idx_meeting_requests_status ON meeting_requests (status);
CREATE INDEX idx_meeting_requests_app ON meeting_requests (application_id) WHERE application_id IS NOT NULL;

CREATE TABLE meeting_participants (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meeting_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL DEFAULT 'participant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (meeting_id, user_id)
);
CREATE INDEX idx_meeting_participants_meeting ON meeting_participants (meeting_id);
CREATE INDEX idx_meeting_participants_user ON meeting_participants (user_id);

CREATE TABLE meeting_availability_blocks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_availability_user ON meeting_availability_blocks (user_id);

CREATE TABLE meeting_status_events (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meeting_requests(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_meeting_status_events_meeting ON meeting_status_events (meeting_id);

CREATE TABLE meeting_reschedule_events (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meeting_requests(id) ON DELETE CASCADE,
    rescheduled_by UUID NOT NULL REFERENCES users(id),
    reason TEXT,
    new_proposed_slots JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_meeting_reschedule_meeting ON meeting_reschedule_events (meeting_id);

CREATE TABLE reminder_jobs (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meeting_requests(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    remind_at TIMESTAMPTZ NOT NULL,
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('t_minus_24h', 't_minus_1h', 't_minus_10m')),
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'delivered', 'cancelled', 'failed')),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (meeting_id, user_id, reminder_type)
);
CREATE INDEX idx_reminder_jobs_status ON reminder_jobs (status, remind_at) WHERE status = 'scheduled';
CREATE INDEX idx_reminder_jobs_meeting ON reminder_jobs (meeting_id);

CREATE TABLE reminder_delivery_events (
    id UUID PRIMARY KEY,
    reminder_job_id UUID NOT NULL REFERENCES reminder_jobs(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INTERVIEW
-- ============================================================

CREATE TABLE video_rooms (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES meeting_requests(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'ended')),
    max_participants INT NOT NULL DEFAULT 10,
    recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_video_rooms_org ON video_rooms (organization_id);

CREATE TABLE video_room_tokens (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES video_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_video_room_tokens_room ON video_room_tokens (room_id);

CREATE TABLE video_sessions (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES video_rooms(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE video_session_participants (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE (session_id, user_id)
);

CREATE TABLE video_session_events (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES video_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_video_session_events_session ON video_session_events (session_id, created_at);

CREATE TABLE pip_session_states (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    is_pip_active BOOLEAN NOT NULL DEFAULT FALSE,
    pip_position VARCHAR(50),
    pip_size VARCHAR(50),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, user_id)
);

-- ============================================================
-- BILLING / ENTITLEMENTS
-- ============================================================

CREATE TABLE plans (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    stripe_product_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),
    monthly_price_cents BIGINT NOT NULL DEFAULT 0,
    annual_price_cents BIGINT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    features JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plan_features (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    limit_value INT,
    unlimited BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (plan_id, feature_key)
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    stripe_subscription_id TEXT NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused', 'incomplete')),
    billing_period VARCHAR(50) NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_org ON subscriptions (organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions (stripe_subscription_id);

CREATE TABLE subscription_items (
    id UUID PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    stripe_item_id TEXT NOT NULL,
    price_id TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usage_meters (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meter_type VARCHAR(100) NOT NULL CHECK (meter_type IN ('job_posts', 'active_candidates', 'messages_sent', 'video_minutes', 'api_calls')),
    current_value BIGINT NOT NULL DEFAULT 0,
    limit_value BIGINT,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, meter_type, period_start)
);
CREATE INDEX idx_usage_meters_org ON usage_meters (organization_id);

CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    amount_cents BIGINT NOT NULL,
    currency CHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    paid_at TIMESTAMPTZ,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invoices_org ON invoices (organization_id);

CREATE TABLE payment_events (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_events_org ON payment_events (organization_id);
CREATE INDEX idx_payment_events_stripe ON payment_events (stripe_event_id);

CREATE TABLE entitlements (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    limit_value INT,
    current_usage INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, feature_key)
);
CREATE INDEX idx_entitlements_org ON entitlements (organization_id);

-- ============================================================
-- SEARCH / SHORTCUTS / AUDIT
-- ============================================================

CREATE TABLE search_index_state (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    last_indexed_at TIMESTAMPTZ NOT NULL,
    last_indexed_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'idle',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shortcut_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    bindings JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shortcut_profiles_user ON shortcut_profiles (user_id);

CREATE TABLE shortcut_bindings (
    id UUID PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES shortcut_profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    keys VARCHAR(100) NOT NULL,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('global', 'page', 'modal')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shortcut_usage_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    shortcut_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    scope VARCHAR(50) NOT NULL,
    page VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shortcut_usage_user ON shortcut_usage_events (user_id, created_at);

CREATE TABLE command_palette_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    query TEXT,
    selected_action VARCHAR(255),
    result_count INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_fingerprint TEXT NOT NULL,
    status_code INT NOT NULL,
    response_body TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX idx_idempotency_keys_tenant ON idempotency_keys (tenant_id, idempotency_key);
CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys (expires_at);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_events_org ON audit_events (organization_id, created_at DESC);
CREATE INDEX idx_audit_events_user ON audit_events (user_id, created_at DESC);
CREATE INDEX idx_audit_events_type ON audit_events (event_type, created_at DESC);
CREATE INDEX idx_audit_events_resource ON audit_events (resource_type, resource_id);

CREATE TABLE security_events (
    id UUID PRIMARY KEY,
    user_id UUID,
    event_type VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    severity VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_security_events_type ON security_events (event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events (severity, created_at DESC);

CREATE TABLE notification_events (
    id UUID PRIMARY KEY,
    organization_id UUID,
    user_id UUID NOT NULL REFERENCES users(id),
    channel VARCHAR(50) NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    subject VARCHAR(255),
    body TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notification_events_user ON notification_events (user_id, created_at DESC);

CREATE TABLE consents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_consents_user ON consents (user_id);

CREATE TABLE deletion_requests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_deletion_requests_user ON deletion_requests (user_id);
CREATE INDEX idx_deletion_requests_status ON deletion_requests (status);

-- Add FK from users to organizations (deferred to avoid circular dependency)
ALTER TABLE users ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE organizations ADD CONSTRAINT fk_organizations_plan FOREIGN KEY (plan_id) REFERENCES plans(id);
ALTER TABLE meeting_requests ADD CONSTRAINT fk_meeting_requests_video_room FOREIGN KEY (video_room_id) REFERENCES video_rooms(id);
