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
    pub job_type: Option<String>,
    pub work_location: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct JobResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub company_id: Uuid,
    pub title: String,
    pub description: String,
    pub status: String,
    pub job_type: String,
    pub work_location: String,
    pub location: Option<String>,
    pub salary_min: Option<i64>,
    pub salary_max: Option<i64>,
    pub salary_currency: Option<String>,
    pub published_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateJobRequest {
    pub title: String,
    pub description: String,
    pub company_id: Option<Uuid>,
    pub job_type: String,
    pub work_location: String,
    pub location: Option<String>,
    pub salary_min: Option<i64>,
    pub salary_max: Option<i64>,
    pub salary_currency: Option<String>,
    pub department: Option<String>,
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Query(params): Query<ListParams>,
) -> AppResult<Json<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(25).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let (query_str, bind_org) = if auth.organization_id.is_some() {
        ("SELECT id, organization_id, company_id, title, description, status, job_type, work_location, location, salary_min, salary_max, salary_currency, published_at, created_at, updated_at FROM job_posts WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", true)
    } else {
        ("SELECT id, organization_id, company_id, title, description, status, job_type, work_location, location, salary_min, salary_max, salary_currency, published_at, created_at, updated_at FROM job_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT $2 OFFSET $3", false)
    };

    let rows = if bind_org {
        sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, String, String, String, Option<String>, Option<i64>, Option<i64>, Option<String>, Option<chrono::DateTime<chrono::Utc>>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            query_str
        )
        .bind(auth.organization_id.unwrap())
        .bind(per_page)
        .bind(offset)
        .fetch_all(&state.db)
        .await?
    } else {
        sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, String, String, String, Option<String>, Option<i64>, Option<i64>, Option<String>, Option<chrono::DateTime<chrono::Utc>>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            "SELECT id, organization_id, company_id, title, description, status, job_type, work_location, location, salary_min, salary_max, salary_currency, published_at, created_at, updated_at FROM job_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(per_page)
        .bind(offset)
        .fetch_all(&state.db)
        .await?
    };

    let data: Vec<JobResponse> = rows
        .into_iter()
        .map(|r| JobResponse {
            id: r.0, organization_id: r.1, company_id: r.2, title: r.3, description: r.4,
            status: r.5, job_type: r.6, work_location: r.7, location: r.8,
            salary_min: r.9, salary_max: r.10, salary_currency: r.11,
            published_at: r.12, created_at: r.13, updated_at: r.14,
        })
        .collect();

    Ok(Json(serde_json::json!({ "data": data })))
}

pub async fn create(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Json(body): Json<CreateJobRequest>,
) -> AppResult<(StatusCode, Json<JobResponse>)> {
    let tenant = TenantContext::from_auth(&auth)?;
    tenant.require_role(&["owner", "admin", "recruiter", "hiring_manager"])?;

    let company_id = body.company_id.ok_or_else(|| AppError::BadRequest("company_id required".to_string()))?;

    let company_org = sqlx::query_scalar::<_, Uuid>("SELECT organization_id FROM companies WHERE id = $1")
        .bind(company_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Company not found".to_string()))?;
    tenant.can_write(company_org)?;

    let id = Uuid::now_v7();
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO job_posts (id, organization_id, company_id, title, description, status, job_type, work_location, location, salary_min, salary_max, salary_currency, department, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, 1, $13, $13)"
    )
    .bind(id).bind(tenant.organization_id).bind(company_id)
    .bind(&body.title).bind(&body.description)
    .bind(&body.job_type).bind(&body.work_location).bind(&body.location)
    .bind(body.salary_min).bind(body.salary_max).bind(&body.salary_currency)
    .bind(&body.department).bind(now)
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(JobResponse {
        id, organization_id: tenant.organization_id, company_id,
        title: body.title, description: body.description, status: "draft".to_string(),
        job_type: body.job_type, work_location: body.work_location, location: body.location,
        salary_min: body.salary_min, salary_max: body.salary_max, salary_currency: body.salary_currency,
        published_at: None, created_at: now, updated_at: now,
    })))
}

pub async fn get_by_id(
    State(state): State<Arc<AppState>>,
    Extension(_auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<JobResponse>> {
    let r = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, String, String, String, Option<String>, Option<i64>, Option<i64>, Option<String>, Option<chrono::DateTime<chrono::Utc>>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        "SELECT id, organization_id, company_id, title, description, status, job_type, work_location, location, salary_min, salary_max, salary_currency, published_at, created_at, updated_at FROM job_posts WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Job not found".to_string()))?;

    Ok(Json(JobResponse {
        id: r.0, organization_id: r.1, company_id: r.2, title: r.3, description: r.4,
        status: r.5, job_type: r.6, work_location: r.7, location: r.8,
        salary_min: r.9, salary_max: r.10, salary_currency: r.11,
        published_at: r.12, created_at: r.13, updated_at: r.14,
    }))
}

pub async fn update(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<CreateJobRequest>,
) -> AppResult<Json<JobResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;
    tenant.require_role(&["owner", "admin", "recruiter", "hiring_manager"])?;

    let org_id = sqlx::query_scalar::<_, Uuid>("SELECT organization_id FROM job_posts WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Job not found".to_string()))?;
    tenant.can_write(org_id)?;

    let now = chrono::Utc::now();
    sqlx::query("UPDATE job_posts SET title = $2, description = $3, job_type = $4, work_location = $5, location = COALESCE($6, location), salary_min = COALESCE($7, salary_min), salary_max = COALESCE($8, salary_max), version = version + 1, updated_at = $9 WHERE id = $1")
        .bind(id).bind(&body.title).bind(&body.description)
        .bind(&body.job_type).bind(&body.work_location).bind(&body.location)
        .bind(body.salary_min).bind(body.salary_max).bind(now)
        .execute(&state.db).await?;

    get_by_id(State(state), Extension(auth), Path(id)).await
}
