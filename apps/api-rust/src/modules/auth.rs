use std::sync::Arc;

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use axum::extract::State;
use axum::http::StatusCode;
use axum::Extension;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::error::{AppError, AppResult};
use crate::middleware::auth::{create_token, AuthUser};
use crate::state::AppState;

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 12, max = 128))]
    pub password: String,
    #[validate(length(min = 1, max = 100))]
    pub first_name: String,
    #[validate(length(min = 1, max = 100))]
    pub last_name: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthTokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: u64,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub id: Uuid,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub organization_id: Option<Uuid>,
    pub email_verified: bool,
    pub mfa_enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<AuthTokenResponse>)> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE email = $1")
        .bind(&body.email)
        .fetch_one(&state.db)
        .await?;

    if existing > 0 {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(body.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Password hashing failed: {}", e)))?
        .to_string();

    let user_id = Uuid::now_v7();
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified, mfa_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, false, $7, $7)"
    )
    .bind(user_id)
    .bind(&body.email)
    .bind(&password_hash)
    .bind(&body.first_name)
    .bind(&body.last_name)
    .bind(&body.role)
    .bind(now)
    .execute(&state.db)
    .await?;

    let access_token = create_token(
        &state.config.jwt_secret,
        user_id,
        &body.email,
        &body.role,
        None,
        state.config.jwt_expiry_seconds,
    )?;

    let refresh_token = create_token(
        &state.config.jwt_secret,
        user_id,
        &body.email,
        &body.role,
        None,
        state.config.refresh_token_expiry_seconds,
    )?;

    Ok((
        StatusCode::CREATED,
        Json(AuthTokenResponse {
            access_token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in: state.config.jwt_expiry_seconds,
        }),
    ))
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> AppResult<Json<AuthTokenResponse>> {
    let row = sqlx::query_as::<_, (Uuid, String, String, Option<Uuid>)>(
        "SELECT id, password_hash, role, organization_id FROM users WHERE email = $1"
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let (user_id, stored_hash, role, org_id) = row;

    let parsed_hash = PasswordHash::new(&stored_hash)
        .map_err(|_| AppError::Unauthorized)?;

    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized)?;

    let access_token = create_token(
        &state.config.jwt_secret,
        user_id,
        &body.email,
        &role,
        org_id,
        state.config.jwt_expiry_seconds,
    )?;

    let refresh_token = create_token(
        &state.config.jwt_secret,
        user_id,
        &body.email,
        &role,
        org_id,
        state.config.refresh_token_expiry_seconds,
    )?;

    Ok(Json(AuthTokenResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: state.config.jwt_expiry_seconds,
    }))
}

pub async fn logout() -> StatusCode {
    StatusCode::NO_CONTENT
}

pub async fn me(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
) -> AppResult<Json<MeResponse>> {
    let row = sqlx::query_as::<_, (String, String, String, bool, bool, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        "SELECT first_name, last_name, role, email_verified, mfa_enabled, created_at, updated_at FROM users WHERE id = $1"
    )
    .bind(auth.id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(MeResponse {
        id: auth.id,
        email: auth.email,
        first_name: row.0,
        last_name: row.1,
        role: row.2,
        organization_id: auth.organization_id,
        email_verified: row.3,
        mfa_enabled: row.4,
        created_at: row.5,
        updated_at: row.6,
    }))
}
