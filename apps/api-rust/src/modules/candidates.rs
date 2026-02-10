use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Extension;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthUser;
use crate::middleware::tenant::TenantContext;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub query: Option<String>,
    pub skills: Option<String>,
    pub location: Option<String>,
    pub availability_status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CandidateResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub headline: Option<String>,
    pub summary: Option<String>,
    pub location: Option<String>,
    pub availability_status: String,
    pub open_to_remote: bool,
    pub years_experience: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub data: Vec<T>,
    pub pagination: PaginationMeta,
}

#[derive(Debug, Serialize)]
pub struct PaginationMeta {
    pub page: i64,
    pub per_page: i64,
    pub total_count: i64,
    pub total_pages: i64,
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Query(params): Query<ListParams>,
) -> AppResult<Json<PaginatedResponse<CandidateResponse>>> {
    let tenant = TenantContext::from_auth(&auth)?;
    tenant.require_role(&["owner", "admin", "recruiter", "hiring_manager"])?;

    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(25).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let total_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM candidate_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE EXISTS (
           SELECT 1 FROM applications a
           JOIN job_posts j ON j.id = a.job_id
           WHERE a.candidate_id = cp.id AND j.organization_id = $1
         )"
    )
    .bind(tenant.organization_id)
    .fetch_one(&state.db)
    .await?;

    let rows = sqlx::query_as::<_, (Uuid, Uuid, Option<String>, Option<String>, Option<String>, String, bool, Option<i32>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        "SELECT cp.id, cp.user_id, cp.headline, cp.summary, cp.location, cp.availability_status, cp.open_to_remote, cp.years_experience, cp.created_at, cp.updated_at
         FROM candidate_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE EXISTS (
           SELECT 1 FROM applications a
           JOIN job_posts j ON j.id = a.job_id
           WHERE a.candidate_id = cp.id AND j.organization_id = $1
         )
         ORDER BY cp.updated_at DESC
         LIMIT $2 OFFSET $3"
    )
    .bind(tenant.organization_id)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let data: Vec<CandidateResponse> = rows
        .into_iter()
        .map(|r| CandidateResponse {
            id: r.0,
            user_id: r.1,
            headline: r.2,
            summary: r.3,
            location: r.4,
            availability_status: r.5,
            open_to_remote: r.6,
            years_experience: r.7,
            created_at: r.8,
            updated_at: r.9,
        })
        .collect();

    let total_pages = (total_count + per_page - 1) / per_page;

    Ok(Json(PaginatedResponse {
        data,
        pagination: PaginationMeta {
            page,
            per_page,
            total_count,
            total_pages,
        },
    }))
}

#[derive(Debug, Deserialize)]
pub struct CreateCandidateRequest {
    pub headline: Option<String>,
    pub summary: Option<String>,
    pub location: Option<String>,
    pub phone: Option<String>,
    pub years_experience: Option<i32>,
    pub open_to_remote: Option<bool>,
    pub open_to_relocation: Option<bool>,
    pub availability_status: Option<String>,
}

pub async fn create(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Json(body): Json<CreateCandidateRequest>,
) -> AppResult<(StatusCode, Json<CandidateResponse>)> {
    auth.require_role("candidate")?;

    let id = Uuid::now_v7();
    let now = chrono::Utc::now();
    let availability = body.availability_status.as_deref().unwrap_or("open");

    sqlx::query(
        "INSERT INTO candidate_profiles (id, user_id, headline, summary, location, phone, years_experience, open_to_remote, open_to_relocation, availability_status, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11, $11)"
    )
    .bind(id)
    .bind(auth.id)
    .bind(&body.headline)
    .bind(&body.summary)
    .bind(&body.location)
    .bind(&body.phone)
    .bind(body.years_experience)
    .bind(body.open_to_remote.unwrap_or(false))
    .bind(body.open_to_relocation.unwrap_or(false))
    .bind(availability)
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(CandidateResponse {
            id,
            user_id: auth.id,
            headline: body.headline,
            summary: body.summary,
            location: body.location,
            availability_status: availability.to_string(),
            open_to_remote: body.open_to_remote.unwrap_or(false),
            years_experience: body.years_experience,
            created_at: now,
            updated_at: now,
        }),
    ))
}

pub async fn get_by_id(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<CandidateResponse>> {
    let row = sqlx::query_as::<_, (Uuid, Uuid, Option<String>, Option<String>, Option<String>, String, bool, Option<i32>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        "SELECT id, user_id, headline, summary, location, availability_status, open_to_remote, years_experience, created_at, updated_at
         FROM candidate_profiles WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Candidate not found".to_string()))?;

    if row.1 != auth.id && auth.organization_id.is_none() {
        return Err(AppError::Forbidden("Access denied".to_string()));
    }

    Ok(Json(CandidateResponse {
        id: row.0,
        user_id: row.1,
        headline: row.2,
        summary: row.3,
        location: row.4,
        availability_status: row.5,
        open_to_remote: row.6,
        years_experience: row.7,
        created_at: row.8,
        updated_at: row.9,
    }))
}

pub async fn update(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<CreateCandidateRequest>,
) -> AppResult<Json<CandidateResponse>> {
    let existing = sqlx::query_scalar::<_, Uuid>(
        "SELECT user_id FROM candidate_profiles WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Candidate not found".to_string()))?;

    if existing != auth.id {
        return Err(AppError::Forbidden("Can only update own profile".to_string()));
    }

    let now = chrono::Utc::now();

    sqlx::query(
        "UPDATE candidate_profiles SET
         headline = COALESCE($2, headline),
         summary = COALESCE($3, summary),
         location = COALESCE($4, location),
         phone = COALESCE($5, phone),
         years_experience = COALESCE($6, years_experience),
         open_to_remote = COALESCE($7, open_to_remote),
         open_to_relocation = COALESCE($8, open_to_relocation),
         availability_status = COALESCE($9, availability_status),
         version = version + 1,
         updated_at = $10
         WHERE id = $1"
    )
    .bind(id)
    .bind(&body.headline)
    .bind(&body.summary)
    .bind(&body.location)
    .bind(&body.phone)
    .bind(body.years_experience)
    .bind(body.open_to_remote)
    .bind(body.open_to_relocation)
    .bind(&body.availability_status)
    .bind(now)
    .execute(&state.db)
    .await?;

    get_by_id(State(state), Extension(auth), Path(id)).await
}

pub async fn upload_document(
    State(_state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    auth.require_role("candidate")?;
    let _ = id;
    Ok(StatusCode::CREATED)
}
