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
pub struct VideoRoomResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub status: String,
    pub max_participants: i32,
    pub recording_enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRoomRequest {
    pub meeting_id: Option<Uuid>,
    pub name: String,
    pub max_participants: Option<i32>,
    pub recording_enabled: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct RoomTokenResponse {
    pub token: String,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

pub async fn create_room(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Json(body): Json<CreateRoomRequest>,
) -> AppResult<(StatusCode, Json<VideoRoomResponse>)> {
    let tenant = TenantContext::from_auth(&auth)?;
    let id = Uuid::now_v7();
    let now = chrono::Utc::now();
    let max_p = body.max_participants.unwrap_or(10);
    let recording = body.recording_enabled.unwrap_or(false);

    sqlx::query(
        "INSERT INTO video_rooms (id, organization_id, meeting_id, name, status, max_participants, recording_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'created', $5, $6, $7, $7)"
    )
    .bind(id).bind(tenant.organization_id).bind(body.meeting_id)
    .bind(&body.name).bind(max_p).bind(recording).bind(now)
    .execute(&state.db).await?;

    Ok((StatusCode::CREATED, Json(VideoRoomResponse {
        id, organization_id: tenant.organization_id, name: body.name,
        status: "created".to_string(), max_participants: max_p,
        recording_enabled: recording, created_at: now,
    })))
}

pub async fn get_room_token(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<RoomTokenResponse>> {
    let org_id = sqlx::query_scalar::<_, Uuid>("SELECT organization_id FROM video_rooms WHERE id = $1")
        .bind(room_id).fetch_optional(&state.db).await?
        .ok_or_else(|| AppError::NotFound("Room not found".to_string()))?;

    if let Some(user_org) = auth.organization_id {
        if user_org != org_id {
            return Err(AppError::NotFound("Room not found".to_string()));
        }
    }

    let token = format!("vrt_{}", Uuid::new_v4());
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(4);

    sqlx::query(
        "INSERT INTO video_room_tokens (id, room_id, user_id, token, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6)"
    )
    .bind(Uuid::now_v7()).bind(room_id).bind(auth.id)
    .bind(&token).bind(expires_at).bind(chrono::Utc::now())
    .execute(&state.db).await?;

    Ok(Json(RoomTokenResponse {
        token, room_id, user_id: auth.id, expires_at,
    }))
}

#[derive(Debug, Deserialize)]
pub struct SessionEventRequest {
    pub event_type: String,
    pub metadata: Option<serde_json::Value>,
}

pub async fn send_session_event(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(session_id): Path<Uuid>,
    Json(body): Json<SessionEventRequest>,
) -> AppResult<StatusCode> {
    let now = chrono::Utc::now();
    sqlx::query(
        "INSERT INTO video_session_events (id, session_id, room_id, user_id, event_type, metadata, created_at, updated_at)
         VALUES ($1, $2, $2, $3, $4, $5, $6, $6)"
    )
    .bind(Uuid::now_v7()).bind(session_id).bind(auth.id)
    .bind(&body.event_type).bind(&body.metadata).bind(now)
    .execute(&state.db).await?;

    Ok(StatusCode::CREATED)
}

#[derive(Debug, Deserialize)]
pub struct FeedbackRequest {
    pub application_id: Uuid,
    pub overall_rating: i32,
    pub recommendation: String,
    pub strengths: Option<String>,
    pub weaknesses: Option<String>,
    pub notes: Option<String>,
}

pub async fn submit_feedback(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(_session_id): Path<Uuid>,
    Json(body): Json<FeedbackRequest>,
) -> AppResult<StatusCode> {
    let tenant = TenantContext::from_auth(&auth)?;
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO interviewer_feedback (id, application_id, organization_id, interviewer_id, overall_rating, recommendation, strengths, weaknesses, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)"
    )
    .bind(Uuid::now_v7()).bind(body.application_id).bind(tenant.organization_id)
    .bind(auth.id).bind(body.overall_rating).bind(&body.recommendation)
    .bind(&body.strengths).bind(&body.weaknesses).bind(&body.notes).bind(now)
    .execute(&state.db).await?;

    Ok(StatusCode::CREATED)
}
