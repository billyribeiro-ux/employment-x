use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Extension;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthUser;
use crate::middleware::tenant::TenantContext;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct ApplicationResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub job_id: Uuid,
    pub candidate_id: Uuid,
    pub current_stage: String,
    pub cover_letter: Option<String>,
    pub applied_at: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ApplyRequest {
    pub cover_letter: Option<String>,
    pub resume_document_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct StageTransitionRequest {
    pub to_stage: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDecisionRequest {
    pub decision: String,
    pub rationale: String,
    pub compensation_offered: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DecisionResponse {
    pub id: Uuid,
    pub application_id: Uuid,
    pub decision: String,
    pub rationale: String,
    pub decided_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn apply(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(job_id): Path<Uuid>,
    Json(body): Json<ApplyRequest>,
) -> AppResult<(StatusCode, Json<ApplicationResponse>)> {
    auth.require_role("candidate")?;

    let job = sqlx::query_as::<_, (Uuid,)>("SELECT organization_id FROM job_posts WHERE id = $1 AND status = 'published'")
        .bind(job_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Job not found or not published".to_string()))?;

    let candidate = sqlx::query_scalar::<_, Uuid>("SELECT id FROM candidate_profiles WHERE user_id = $1")
        .bind(auth.id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::BadRequest("Create a candidate profile first".to_string()))?;

    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM applications WHERE job_id = $1 AND candidate_id = $2"
    )
    .bind(job_id)
    .bind(candidate)
    .fetch_one(&state.db)
    .await?;

    if existing > 0 {
        return Err(AppError::Conflict("Already applied to this job".to_string()));
    }

    let id = Uuid::now_v7();
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO applications (id, organization_id, job_id, candidate_id, current_stage, cover_letter, resume_document_id, source, applied_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'applied', $5, $6, 'direct', $7, $7, $7)"
    )
    .bind(id).bind(job.0).bind(job_id).bind(candidate)
    .bind(&body.cover_letter).bind(body.resume_document_id).bind(now)
    .execute(&state.db)
    .await?;

    sqlx::query(
        "INSERT INTO application_stage_events (id, application_id, organization_id, from_stage, to_stage, changed_by, notes, created_at)
         VALUES ($1, $2, $3, NULL, 'applied', $4, NULL, $5)"
    )
    .bind(Uuid::now_v7()).bind(id).bind(job.0).bind(auth.id).bind(now)
    .execute(&state.db)
    .await?;

    sqlx::query(
        "INSERT INTO audit_events (id, organization_id, user_id, event_type, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, 'application.created', 'application', $4, $5, $6)"
    )
    .bind(Uuid::now_v7()).bind(job.0).bind(auth.id).bind(id)
    .bind(serde_json::json!({"job_id": job_id})).bind(now)
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(ApplicationResponse {
        id, organization_id: job.0, job_id, candidate_id: candidate,
        current_stage: "applied".to_string(), cover_letter: body.cover_letter,
        applied_at: now, created_at: now, updated_at: now,
    })))
}

pub async fn get_by_id(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<ApplicationResponse>> {
    let r = sqlx::query_as::<_, (Uuid, Uuid, Uuid, Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        "SELECT id, organization_id, job_id, candidate_id, current_stage, cover_letter, applied_at, created_at, updated_at FROM applications WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Application not found".to_string()))?;

    if let Some(org_id) = auth.organization_id {
        if r.1 != org_id {
            return Err(AppError::NotFound("Application not found".to_string()));
        }
    }

    Ok(Json(ApplicationResponse {
        id: r.0, organization_id: r.1, job_id: r.2, candidate_id: r.3,
        current_stage: r.4, cover_letter: r.5,
        applied_at: r.6, created_at: r.7, updated_at: r.8,
    }))
}

pub async fn transition_stage(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<StageTransitionRequest>,
) -> AppResult<Json<ApplicationResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;
    tenant.require_role(&["owner", "admin", "recruiter", "hiring_manager"])?;

    let current = sqlx::query_as::<_, (Uuid, String)>(
        "SELECT organization_id, current_stage FROM applications WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Application not found".to_string()))?;

    tenant.can_write(current.0)?;

    let now = chrono::Utc::now();

    sqlx::query("UPDATE applications SET current_stage = $2, updated_at = $3 WHERE id = $1")
        .bind(id).bind(&body.to_stage).bind(now)
        .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO application_stage_events (id, application_id, organization_id, from_stage, to_stage, changed_by, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
    .bind(Uuid::now_v7()).bind(id).bind(current.0)
    .bind(&current.1).bind(&body.to_stage).bind(auth.id).bind(&body.notes).bind(now)
    .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO audit_events (id, organization_id, user_id, event_type, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, 'application.stage_changed', 'application', $4, $5, $6)"
    )
    .bind(Uuid::now_v7()).bind(current.0).bind(auth.id).bind(id)
    .bind(serde_json::json!({"from": current.1, "to": body.to_stage})).bind(now)
    .execute(&state.db).await?;

    get_by_id(State(state), Extension(auth), Path(id)).await
}

pub async fn create_decision(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<CreateDecisionRequest>,
) -> AppResult<(StatusCode, Json<DecisionResponse>)> {
    let tenant = TenantContext::from_auth(&auth)?;
    tenant.require_role(&["owner", "admin", "hiring_manager"])?;

    let org_id = sqlx::query_scalar::<_, Uuid>("SELECT organization_id FROM applications WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Application not found".to_string()))?;
    tenant.can_write(org_id)?;

    let decision_id = Uuid::now_v7();
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO decision_records (id, application_id, organization_id, decision, decided_by, rationale, compensation_offered, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)"
    )
    .bind(decision_id).bind(id).bind(org_id)
    .bind(&body.decision).bind(auth.id).bind(&body.rationale).bind(&body.compensation_offered).bind(now)
    .execute(&state.db).await?;

    let final_stage = match body.decision.as_str() {
        "hire" => "hired",
        "reject" => "rejected",
        _ => "applied",
    };
    sqlx::query("UPDATE applications SET current_stage = $2, updated_at = $3 WHERE id = $1")
        .bind(id).bind(final_stage).bind(now)
        .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO audit_events (id, organization_id, user_id, event_type, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, 'application.decision', 'application', $4, $5, $6)"
    )
    .bind(Uuid::now_v7()).bind(org_id).bind(auth.id).bind(id)
    .bind(serde_json::json!({"decision": body.decision})).bind(now)
    .execute(&state.db).await?;

    Ok((StatusCode::CREATED, Json(DecisionResponse {
        id: decision_id, application_id: id, decision: body.decision,
        rationale: body.rationale, decided_by: auth.id, created_at: now,
    })))
}
