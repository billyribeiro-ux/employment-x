use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct DemoSessionResponse {
    pub session_id: Uuid,
    pub session_token: String,
    pub role: String,
    pub access_token: String,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub seed_version: String,
}

#[derive(Debug, Deserialize)]
pub struct StartDemoRequest {
    pub role: String,
}

#[derive(Debug, Serialize)]
pub struct DemoResetResponse {
    pub session_id: Uuid,
    pub entities_deleted: i32,
    pub duration_ms: i32,
}

#[derive(Debug, Serialize)]
pub struct DemoAnalyticsResponse {
    pub session_id: Uuid,
    pub role: String,
    pub actions: Vec<DemoActionSummary>,
    pub total_actions: i64,
    pub session_duration_seconds: i64,
}

#[derive(Debug, Serialize)]
pub struct DemoActionSummary {
    pub action: String,
    pub count: i64,
    pub last_at: chrono::DateTime<chrono::Utc>,
}

pub async fn start_demo(
    State(state): State<Arc<AppState>>,
    Json(body): Json<StartDemoRequest>,
) -> AppResult<(StatusCode, Json<DemoSessionResponse>)> {
    let valid_roles = ["candidate", "employer", "agency"];
    if !valid_roles.contains(&body.role.as_str()) {
        return Err(AppError::Validation(format!(
            "Invalid demo role '{}'. Must be one of: candidate, employer, agency",
            body.role
        )));
    }

    let seed = sqlx::query_as::<_, (Uuid, String)>(
        "SELECT id, version_tag FROM demo_seed_versions WHERE is_current = true LIMIT 1",
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Internal(anyhow::anyhow!("No demo seed version configured")))?;

    let now = chrono::Utc::now();
    let expires_at = now + chrono::Duration::hours(2);

    let org_id = Uuid::now_v7();
    let org_slug = format!("demo-{}-{}", body.role, &org_id.to_string()[..8]);

    sqlx::query(
        "INSERT INTO organizations (id, name, slug, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)",
    )
    .bind(org_id)
    .bind(format!("Demo {} Workspace", capitalize(&body.role)))
    .bind(&org_slug)
    .bind(now)
    .execute(&state.db)
    .await?;

    let user_id = Uuid::now_v7();
    let demo_email = format!("demo-{}@employmentx.local", &user_id.to_string()[..8]);
    let password_hash = "$argon2id$v=19$m=19456,t=2,p=1$DEMO_PLACEHOLDER_HASH";

    sqlx::query(
        "INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, email_verified, mfa_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, false, $8, $8)",
    )
    .bind(user_id)
    .bind(&demo_email)
    .bind(password_hash)
    .bind("Demo")
    .bind(capitalize(&body.role))
    .bind(&body.role)
    .bind(org_id)
    .bind(now)
    .execute(&state.db)
    .await?;

    let member_role = match body.role.as_str() {
        "employer" | "agency" => "owner",
        _ => "viewer",
    };
    sqlx::query(
        "INSERT INTO organization_members (id, organization_id, user_id, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5)",
    )
    .bind(Uuid::now_v7())
    .bind(org_id)
    .bind(user_id)
    .bind(member_role)
    .bind(now)
    .execute(&state.db)
    .await?;

    seed_demo_data(&state, org_id, user_id, &body.role, seed.0).await?;

    let session_id = Uuid::now_v7();
    let session_token = format!("demo_{}", Uuid::new_v4());

    sqlx::query(
        "INSERT INTO demo_sessions (id, role, tenant_id, user_id, seed_version_id, session_token, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)",
    )
    .bind(session_id)
    .bind(&body.role)
    .bind(org_id)
    .bind(user_id)
    .bind(seed.0)
    .bind(&session_token)
    .bind(expires_at)
    .bind(now)
    .execute(&state.db)
    .await?;

    let access_token = crate::middleware::auth::create_token(
        &state.config.jwt_secret,
        user_id,
        &demo_email,
        &body.role,
        Some(org_id),
        7200,
    )?;

    sqlx::query(
        "INSERT INTO demo_action_events (id, session_id, tenant_id, user_id, role, action, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, 'demo.started', $6, $7)",
    )
    .bind(Uuid::now_v7())
    .bind(session_id)
    .bind(org_id)
    .bind(user_id)
    .bind(&body.role)
    .bind(serde_json::json!({"seed_version": seed.1}))
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(DemoSessionResponse {
            session_id,
            session_token,
            role: body.role,
            access_token,
            tenant_id: org_id,
            user_id,
            expires_at,
            seed_version: seed.1,
        }),
    ))
}

pub async fn reset_demo(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<Uuid>,
) -> AppResult<Json<DemoResetResponse>> {
    let start = std::time::Instant::now();

    let session = sqlx::query_as::<_, (Uuid, Uuid, String, Uuid)>(
        "SELECT tenant_id, user_id, role, seed_version_id FROM demo_sessions WHERE id = $1 AND is_active = true",
    )
    .bind(session_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Demo session not found or expired".to_string()))?;

    let (tenant_id, user_id, role, seed_version_id) = session;
    let mut deleted = 0i32;

    let tables_to_clean = [
        "demo_action_events",
        "interviewer_feedback",
        "decision_records",
        "scorecards",
        "application_stage_events",
        "applications",
        "job_posts",
        "candidate_skills",
        "candidate_documents",
        "candidate_profiles",
        "employer_profiles",
        "companies",
        "reminder_jobs",
        "meeting_participants",
        "meeting_status_events",
        "meeting_reschedule_events",
        "meeting_requests",
        "message_receipts",
        "messages",
        "conversation_participants",
        "conversations",
        "video_session_events",
        "video_room_tokens",
        "video_rooms",
    ];

    for table in &tables_to_clean {
        let result = sqlx::query(&format!(
            "DELETE FROM {} WHERE organization_id = $1",
            table
        ))
        .bind(tenant_id)
        .execute(&state.db)
        .await;

        if let Ok(r) = result {
            deleted += r.rows_affected() as i32;
        }
    }

    seed_demo_data(&state, tenant_id, user_id, &role, seed_version_id).await?;

    let duration_ms = start.elapsed().as_millis() as i32;
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO demo_resets (id, session_id, tenant_id, trigger, entities_deleted, duration_ms, created_at)
         VALUES ($1, $2, $3, 'manual', $4, $5, $6)",
    )
    .bind(Uuid::now_v7())
    .bind(session_id)
    .bind(tenant_id)
    .bind(deleted)
    .bind(duration_ms)
    .bind(now)
    .execute(&state.db)
    .await?;

    sqlx::query("UPDATE demo_sessions SET reset_count = reset_count + 1, last_active_at = $2, updated_at = $2 WHERE id = $1")
        .bind(session_id)
        .bind(now)
        .execute(&state.db)
        .await?;

    Ok(Json(DemoResetResponse {
        session_id,
        entities_deleted: deleted,
        duration_ms,
    }))
}

pub async fn track_demo_action(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<Uuid>,
    Json(body): Json<TrackActionRequest>,
) -> AppResult<StatusCode> {
    let session = sqlx::query_as::<_, (Uuid, Uuid, String)>(
        "SELECT tenant_id, user_id, role FROM demo_sessions WHERE id = $1 AND is_active = true",
    )
    .bind(session_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Demo session not found".to_string()))?;

    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO demo_action_events (id, session_id, tenant_id, user_id, role, action, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    )
    .bind(Uuid::now_v7())
    .bind(session_id)
    .bind(session.0)
    .bind(session.1)
    .bind(&session.2)
    .bind(&body.action)
    .bind(&body.resource_type)
    .bind(body.resource_id)
    .bind(&body.metadata.clone().unwrap_or_default())
    .bind(now)
    .execute(&state.db)
    .await?;

    sqlx::query("UPDATE demo_sessions SET last_active_at = $2, updated_at = $2 WHERE id = $1")
        .bind(session_id)
        .bind(now)
        .execute(&state.db)
        .await?;

    Ok(StatusCode::CREATED)
}

pub async fn get_demo_analytics(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<Uuid>,
) -> AppResult<Json<DemoAnalyticsResponse>> {
    let session = sqlx::query_as::<_, (String, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        "SELECT role, started_at, last_active_at FROM demo_sessions WHERE id = $1",
    )
    .bind(session_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Demo session not found".to_string()))?;

    let total_actions = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM demo_action_events WHERE session_id = $1",
    )
    .bind(session_id)
    .fetch_one(&state.db)
    .await?;

    let action_rows = sqlx::query_as::<_, (String, i64, chrono::DateTime<chrono::Utc>)>(
        "SELECT action, COUNT(*) as cnt, MAX(created_at) as last_at
         FROM demo_action_events WHERE session_id = $1
         GROUP BY action ORDER BY cnt DESC",
    )
    .bind(session_id)
    .fetch_all(&state.db)
    .await?;

    let actions: Vec<DemoActionSummary> = action_rows
        .into_iter()
        .map(|r| DemoActionSummary {
            action: r.0,
            count: r.1,
            last_at: r.2,
        })
        .collect();

    let duration = (session.2 - session.1).num_seconds();

    Ok(Json(DemoAnalyticsResponse {
        session_id,
        role: session.0,
        actions,
        total_actions,
        session_duration_seconds: duration,
    }))
}

#[derive(Debug, Deserialize)]
pub struct TrackActionRequest {
    pub action: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<Uuid>,
    pub metadata: Option<serde_json::Value>,
}

async fn seed_demo_data(
    state: &AppState,
    org_id: Uuid,
    user_id: Uuid,
    role: &str,
    _seed_version_id: Uuid,
) -> AppResult<()> {
    let now = chrono::Utc::now();

    let company_id = Uuid::now_v7();
    sqlx::query(
        "INSERT INTO companies (id, organization_id, name, description, website, industry, company_size, headquarters_location, created_at, updated_at)
         VALUES ($1, $2, 'Acme Corp', 'Leading technology company', 'https://acme.example.com', 'Technology', '201-500', 'San Francisco, CA', $3, $3)",
    )
    .bind(company_id)
    .bind(org_id)
    .bind(now)
    .execute(&state.db)
    .await?;

    let company2_id = Uuid::now_v7();
    sqlx::query(
        "INSERT INTO companies (id, organization_id, name, description, website, industry, company_size, headquarters_location, created_at, updated_at)
         VALUES ($1, $2, 'Globex Industries', 'Global manufacturing and innovation', 'https://globex.example.com', 'Manufacturing', '1001-5000', 'New York, NY', $3, $3)",
    )
    .bind(company2_id)
    .bind(org_id)
    .bind(now)
    .execute(&state.db)
    .await?;

    let job_titles = [
        ("Senior Software Engineer", "full_time", "remote", 150000i64, 220000i64),
        ("Product Manager", "full_time", "hybrid", 130000, 180000),
        ("UX Designer", "full_time", "onsite", 110000, 160000),
        ("DevOps Engineer", "contract", "remote", 140000, 200000),
        ("Data Scientist", "full_time", "hybrid", 145000, 210000),
    ];

    let mut job_ids = Vec::new();
    for (title, jtype, wloc, smin, smax) in &job_titles {
        let jid = Uuid::now_v7();
        job_ids.push(jid);
        sqlx::query(
            "INSERT INTO job_posts (id, organization_id, company_id, title, description, status, job_type, work_location, location, salary_min, salary_max, salary_currency, salary_period, version, published_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'published', $6, $7, 'San Francisco, CA', $8, $9, 'USD', 'yearly', 1, $10, $10, $10)",
        )
        .bind(jid)
        .bind(org_id)
        .bind(company_id)
        .bind(title)
        .bind(format!("We are looking for an experienced {} to join our team. This is a demo job posting.", title))
        .bind(jtype)
        .bind(wloc)
        .bind(smin)
        .bind(smax)
        .bind(now)
        .execute(&state.db)
        .await?;
    }

    let candidate_names = [
        ("Alice", "Chen", "Senior Full-Stack Engineer"),
        ("Bob", "Martinez", "Product Design Lead"),
        ("Carol", "Johnson", "ML Engineer"),
        ("David", "Kim", "Platform Architect"),
        ("Eva", "Patel", "Engineering Manager"),
    ];

    let mut candidate_ids = Vec::new();
    let mut candidate_user_ids = Vec::new();
    for (first, last, headline) in &candidate_names {
        let cuid = Uuid::now_v7();
        candidate_user_ids.push(cuid);
        let cemail = format!("demo-{}-{}@employmentx.local", first.to_lowercase(), &cuid.to_string()[..6]);
        sqlx::query(
            "INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, email_verified, mfa_enabled, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'candidate', NULL, true, false, $6, $6)",
        )
        .bind(cuid)
        .bind(&cemail)
        .bind("$argon2id$v=19$m=19456,t=2,p=1$DEMO_CANDIDATE_HASH")
        .bind(first)
        .bind(last)
        .bind(now)
        .execute(&state.db)
        .await?;

        let cpid = Uuid::now_v7();
        candidate_ids.push(cpid);
        sqlx::query(
            "INSERT INTO candidate_profiles (id, user_id, headline, summary, location, availability_status, open_to_remote, years_experience, version, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'San Francisco, CA', 'open', true, $5, 1, $6, $6)",
        )
        .bind(cpid)
        .bind(cuid)
        .bind(headline)
        .bind(format!("Experienced {} with a passion for building great products. Demo profile.", headline))
        .bind(8 + (candidate_ids.len() as i32 % 7))
        .bind(now)
        .execute(&state.db)
        .await?;
    }

    if !job_ids.is_empty() && !candidate_ids.is_empty() {
        let stages = ["applied", "screening", "technical_interview"];
        for (i, cid) in candidate_ids.iter().enumerate().take(3) {
            let jid = job_ids[i % job_ids.len()];
            let stage = stages[i % stages.len()];
            let app_id = Uuid::now_v7();
            sqlx::query(
                "INSERT INTO applications (id, organization_id, job_id, candidate_id, current_stage, source, applied_at, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 'direct', $6, $6, $6)",
            )
            .bind(app_id)
            .bind(org_id)
            .bind(jid)
            .bind(cid)
            .bind(stage)
            .bind(now)
            .execute(&state.db)
            .await?;

            sqlx::query(
                "INSERT INTO application_stage_events (id, application_id, organization_id, from_stage, to_stage, changed_by, created_at)
                 VALUES ($1, $2, $3, NULL, 'applied', $4, $5)",
            )
            .bind(Uuid::now_v7())
            .bind(app_id)
            .bind(org_id)
            .bind(user_id)
            .bind(now)
            .execute(&state.db)
            .await?;
        }
    }

    if role == "employer" || role == "agency" {
        if let Some(&cuid) = candidate_user_ids.first() {
            let conv_id = Uuid::now_v7();
            sqlx::query(
                "INSERT INTO conversations (id, organization_id, subject, conversation_type, last_message_at, is_archived, created_at, updated_at)
                 VALUES ($1, $2, 'Re: Senior Software Engineer position', 'direct', $3, false, $3, $3)",
            )
            .bind(conv_id)
            .bind(org_id)
            .bind(now)
            .execute(&state.db)
            .await?;

            for uid in [user_id, cuid] {
                sqlx::query(
                    "INSERT INTO conversation_participants (id, conversation_id, user_id, joined_at, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $4, $4)",
                )
                .bind(Uuid::now_v7())
                .bind(conv_id)
                .bind(uid)
                .bind(now)
                .execute(&state.db)
                .await?;
            }

            let messages = [
                (user_id, "Hi Alice, I came across your profile and think you'd be a great fit for our Senior Software Engineer role. Would you be interested in learning more?"),
                (cuid, "Hi! Thanks for reaching out. I'd love to hear more about the role and the team. What does the tech stack look like?"),
                (user_id, "We use Rust for our backend services and React/TypeScript for the frontend. The team is about 12 engineers. Would you be available for a quick call this week?"),
            ];

            for (sender, body) in &messages {
                sqlx::query(
                    "INSERT INTO messages (id, conversation_id, sender_id, body, is_edited, is_deleted, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, false, false, $5, $5)",
                )
                .bind(Uuid::now_v7())
                .bind(conv_id)
                .bind(sender)
                .bind(body)
                .bind(now)
                .execute(&state.db)
                .await?;
            }
        }

        let meeting_id = Uuid::now_v7();
        sqlx::query(
            "INSERT INTO meeting_requests (id, organization_id, requester_id, title, description, status, meeting_type, timezone, duration_minutes, proposed_slots, created_at, updated_at)
             VALUES ($1, $2, $3, 'Technical Interview — Alice Chen', 'Technical screen for Senior Software Engineer', 'pending', 'technical', 'America/Los_Angeles', 60, $4, $5, $5)",
        )
        .bind(meeting_id)
        .bind(org_id)
        .bind(user_id)
        .bind(serde_json::json!([
            {"start": "2026-02-12T10:00:00-08:00", "end": "2026-02-12T11:00:00-08:00"},
            {"start": "2026-02-13T14:00:00-08:00", "end": "2026-02-13T15:00:00-08:00"}
        ]))
        .bind(now)
        .execute(&state.db)
        .await?;

        if let Some(&cuid) = candidate_user_ids.first() {
            sqlx::query(
                "INSERT INTO meeting_participants (id, meeting_id, user_id, role, created_at, updated_at)
                 VALUES ($1, $2, $3, 'participant', $4, $4)",
            )
            .bind(Uuid::now_v7())
            .bind(meeting_id)
            .bind(cuid)
            .bind(now)
            .execute(&state.db)
            .await?;
        }
    }

    Ok(())
}

fn capitalize(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}
