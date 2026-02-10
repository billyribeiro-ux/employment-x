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
pub struct CompanyResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct EmployerProfileResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub organization_id: Uuid,
    pub company_id: Uuid,
    pub title: Option<String>,
    pub department: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCompanyRequest {
    pub name: String,
    pub description: Option<String>,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub headquarters_location: Option<String>,
}

pub async fn list_companies(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
) -> AppResult<Json<serde_json::Value>> {
    let tenant = TenantContext::from_auth(&auth)?;

    let rows = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, chrono::DateTime<chrono::Utc>)>(
        "SELECT id, name, industry, website, created_at FROM companies WHERE organization_id = $1 ORDER BY name"
    )
    .bind(tenant.organization_id)
    .fetch_all(&state.db)
    .await?;

    let data: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| serde_json::json!({
            "id": r.0,
            "name": r.1,
            "industry": r.2,
            "website": r.3,
            "created_at": r.4,
        }))
        .collect();

    Ok(Json(serde_json::json!({ "data": data })))
}

pub async fn create_company(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Json(body): Json<CreateCompanyRequest>,
) -> AppResult<(StatusCode, Json<CompanyResponse>)> {
    let tenant = TenantContext::from_auth(&auth)?;
    tenant.require_role(&["owner", "admin"])?;

    let id = Uuid::now_v7();
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO companies (id, organization_id, name, description, website, industry, company_size, headquarters_location, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)"
    )
    .bind(id)
    .bind(tenant.organization_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(&body.website)
    .bind(&body.industry)
    .bind(&body.company_size)
    .bind(&body.headquarters_location)
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(CompanyResponse {
            id,
            organization_id: tenant.organization_id,
            name: body.name,
            description: body.description,
            website: body.website,
            industry: body.industry,
            company_size: body.company_size,
            created_at: now,
            updated_at: now,
        }),
    ))
}

pub async fn update_company(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<CreateCompanyRequest>,
) -> AppResult<Json<CompanyResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;
    tenant.require_role(&["owner", "admin"])?;

    let org_id = sqlx::query_scalar::<_, Uuid>(
        "SELECT organization_id FROM companies WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Company not found".to_string()))?;

    tenant.can_write(org_id)?;

    let now = chrono::Utc::now();

    sqlx::query(
        "UPDATE companies SET name = $2, description = COALESCE($3, description), website = COALESCE($4, website), industry = COALESCE($5, industry), company_size = COALESCE($6, company_size), headquarters_location = COALESCE($7, headquarters_location), updated_at = $8 WHERE id = $1"
    )
    .bind(id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(&body.website)
    .bind(&body.industry)
    .bind(&body.company_size)
    .bind(&body.headquarters_location)
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok(Json(CompanyResponse {
        id,
        organization_id: tenant.organization_id,
        name: body.name,
        description: body.description,
        website: body.website,
        industry: body.industry,
        company_size: body.company_size,
        created_at: now,
        updated_at: now,
    }))
}

pub async fn get_my_profile(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
) -> AppResult<Json<EmployerProfileResponse>> {
    let row = sqlx::query_as::<_, (Uuid, Uuid, Uuid, Uuid, Option<String>, Option<String>)>(
        "SELECT id, user_id, organization_id, company_id, title, department FROM employer_profiles WHERE user_id = $1"
    )
    .bind(auth.id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Employer profile not found".to_string()))?;

    Ok(Json(EmployerProfileResponse {
        id: row.0,
        user_id: row.1,
        organization_id: row.2,
        company_id: row.3,
        title: row.4,
        department: row.5,
    }))
}
