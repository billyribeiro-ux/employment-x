use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::Extension;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthUser;
use crate::middleware::tenant::TenantContext;
use crate::state::AppState;

// ─── Shared Types ────────────────────────────────────────────────────────────

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

// ─── Existing Handlers ───────────────────────────────────────────────────────

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

// ─── New Video Interview Endpoints ───────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct IssueVideoTokenRequest {
    pub device: Option<DeviceInfo>,
    pub capabilities: Option<Capabilities>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DeviceInfo {
    pub kind: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Capabilities {
    pub can_publish: Option<bool>,
    pub can_subscribe: Option<bool>,
    pub can_publish_data: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct IssueVideoTokenResponse {
    pub meeting_id: Uuid,
    pub room_name: String,
    pub token: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub participant: ParticipantInfo,
    pub capabilities: CapabilitiesResponse,
}

#[derive(Debug, Serialize)]
pub struct ParticipantInfo {
    pub user_id: Uuid,
    pub role: String,
    pub display_name: String,
}

#[derive(Debug, Serialize)]
pub struct CapabilitiesResponse {
    pub can_publish: bool,
    pub can_subscribe: bool,
    pub can_publish_data: bool,
}

pub async fn issue_video_token(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    headers: HeaderMap,
    Path(meeting_id): Path<Uuid>,
    Json(body): Json<IssueVideoTokenRequest>,
) -> AppResult<Json<IssueVideoTokenResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;
    let now = chrono::Utc::now();
    let correlation_id = headers
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    let meeting = sqlx::query_as::<_, (Uuid, Uuid, String, String, String, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>, Option<chrono::DateTime<chrono::Utc>>, Option<chrono::DateTime<chrono::Utc>>, Option<String>)>(
        "SELECT id, organization_id, status, title, timezone, created_at, updated_at,
                join_window_open_at, join_window_close_at, provider_room_name
         FROM meeting_requests WHERE id = $1 AND organization_id = $2"
    )
    .bind(meeting_id)
    .bind(tenant.organization_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Meeting not found".to_string()))?;

    let status = &meeting.2;
    if status != "accepted" && status != "completed" && status != "pending" {
        return Err(AppError::Conflict("Meeting is not in a joinable state".to_string()));
    }

    if let (Some(open), Some(close)) = (meeting.7, meeting.8) {
        if now < open || now > close {
            return Err(AppError::Validation("Join window is closed".to_string()));
        }
    }

    let participant_role = sqlx::query_scalar::<_, String>(
        "SELECT role FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2"
    )
    .bind(meeting_id)
    .bind(auth.id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Forbidden("You are not a participant of this meeting".to_string()))?;

    let room_name = match &meeting.9 {
        Some(name) => name.clone(),
        None => {
            let generated = format!("t_{}_m_{}", tenant.organization_id, meeting_id);
            sqlx::query("UPDATE meeting_requests SET provider_room_name = $1 WHERE id = $2")
                .bind(&generated)
                .bind(meeting_id)
                .execute(&state.db)
                .await?;
            generated
        }
    };

    let ttl_seconds = 180i64;
    let expires_at = now + chrono::Duration::seconds(ttl_seconds);
    let token = format!("vrt_{}_{}", meeting_id, Uuid::new_v4());

    sqlx::query(
        "INSERT INTO video_room_tokens (id, room_id, user_id, token, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6)"
    )
    .bind(Uuid::now_v7())
    .bind(meeting_id)
    .bind(auth.id)
    .bind(&token)
    .bind(expires_at)
    .bind(now)
    .execute(&state.db)
    .await?;

    let display_name = sqlx::query_scalar::<_, String>(
        "SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = $1"
    )
    .bind(auth.id)
    .fetch_optional(&state.db)
    .await?
    .unwrap_or_else(|| "Unknown User".to_string());

    sqlx::query(
        "INSERT INTO meeting_events (id, meeting_id, organization_id, actor_user_id, event_type, correlation_id, payload_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'token_issued', $5, $6, $7, $7)"
    )
    .bind(Uuid::now_v7())
    .bind(meeting_id)
    .bind(tenant.organization_id)
    .bind(auth.id)
    .bind(&correlation_id)
    .bind(serde_json::json!({
        "room_name": room_name,
        "role": participant_role,
        "expires_at": expires_at.to_rfc3339(),
    }))
    .bind(now)
    .execute(&state.db)
    .await?;

    let caps = body.capabilities.unwrap_or(Capabilities {
        can_publish: Some(true),
        can_subscribe: Some(true),
        can_publish_data: Some(true),
    });

    Ok(Json(IssueVideoTokenResponse {
        meeting_id,
        room_name,
        token,
        expires_at,
        participant: ParticipantInfo {
            user_id: auth.id,
            role: participant_role,
            display_name,
        },
        capabilities: CapabilitiesResponse {
            can_publish: caps.can_publish.unwrap_or(true),
            can_subscribe: caps.can_subscribe.unwrap_or(true),
            can_publish_data: caps.can_publish_data.unwrap_or(true),
        },
    }))
}

// ─── GET /v1/meetings/:id/interview-room ─────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct InterviewRoomResponse {
    pub meeting: InterviewRoomMeeting,
    pub participant: ParticipantInfo,
    pub permissions: InterviewRoomPermissions,
}

#[derive(Debug, Serialize)]
pub struct InterviewRoomMeeting {
    pub id: Uuid,
    pub title: String,
    pub status: String,
    pub scheduled_start_at: chrono::DateTime<chrono::Utc>,
    pub scheduled_end_at: chrono::DateTime<chrono::Utc>,
    pub join_window_open_at: Option<chrono::DateTime<chrono::Utc>>,
    pub join_window_close_at: Option<chrono::DateTime<chrono::Utc>>,
    pub timezone: String,
}

#[derive(Debug, Serialize)]
pub struct InterviewRoomPermissions {
    pub can_join: bool,
    pub can_end: bool,
}

pub async fn get_interview_room(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(meeting_id): Path<Uuid>,
) -> AppResult<Json<InterviewRoomResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;
    let now = chrono::Utc::now();

    let row = sqlx::query_as::<_, (Uuid, String, String, String, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>, Option<chrono::DateTime<chrono::Utc>>, Option<chrono::DateTime<chrono::Utc>>)>(
        "SELECT id, title, status, timezone, created_at, updated_at, join_window_open_at, join_window_close_at
         FROM meeting_requests WHERE id = $1 AND organization_id = $2"
    )
    .bind(meeting_id)
    .bind(tenant.organization_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Meeting not found".to_string()))?;

    let participant_role = sqlx::query_scalar::<_, String>(
        "SELECT role FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2"
    )
    .bind(meeting_id)
    .bind(auth.id)
    .fetch_optional(&state.db)
    .await?;

    let is_admin = auth.role == "admin" || auth.role == "owner";
    if participant_role.is_none() && !is_admin {
        return Err(AppError::Forbidden("Not allowed to access this interview room".to_string()));
    }

    let role_str = participant_role.clone().unwrap_or_else(|| "admin".to_string());
    let joinable_statuses = ["accepted", "pending"];
    let within_window = match (row.6, row.7) {
        (Some(open), Some(close)) => now >= open && now <= close,
        _ => true,
    };
    let can_join = joinable_statuses.contains(&row.2.as_str()) && within_window;
    let can_end = is_admin || ["host", "interviewer", "recruiter"].contains(&role_str.as_str());

    let display_name = sqlx::query_scalar::<_, String>(
        "SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = $1"
    )
    .bind(auth.id)
    .fetch_optional(&state.db)
    .await?
    .unwrap_or_else(|| "Unknown User".to_string());

    Ok(Json(InterviewRoomResponse {
        meeting: InterviewRoomMeeting {
            id: row.0,
            title: row.1,
            status: row.2,
            scheduled_start_at: row.4,
            scheduled_end_at: row.5,
            join_window_open_at: row.6,
            join_window_close_at: row.7,
            timezone: row.3,
        },
        participant: ParticipantInfo {
            user_id: auth.id,
            role: role_str,
            display_name,
        },
        permissions: InterviewRoomPermissions { can_join, can_end },
    }))
}

// ─── POST /v1/meetings/:id/end ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct EndMeetingRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EndMeetingResponse {
    pub meeting_id: Uuid,
    pub status: String,
    pub ended_at: chrono::DateTime<chrono::Utc>,
}

pub async fn end_meeting(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    headers: HeaderMap,
    Path(meeting_id): Path<Uuid>,
    Json(body): Json<EndMeetingRequest>,
) -> AppResult<Json<EndMeetingResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;
    let now = chrono::Utc::now();
    let correlation_id = headers
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    let participant_role = sqlx::query_scalar::<_, String>(
        "SELECT role FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2"
    )
    .bind(meeting_id)
    .bind(auth.id)
    .fetch_optional(&state.db)
    .await?;

    let is_admin = auth.role == "admin" || auth.role == "owner";
    if participant_role.is_none() && !is_admin {
        return Err(AppError::Forbidden("Not allowed to end this meeting".to_string()));
    }

    let role_str = participant_role.unwrap_or_else(|| "admin".to_string());
    let end_allowed = ["host", "interviewer", "recruiter", "admin", "owner"];
    if !end_allowed.contains(&role_str.as_str()) {
        return Err(AppError::Forbidden("Insufficient privileges to end meeting".to_string()));
    }

    let meeting_status = sqlx::query_scalar::<_, String>(
        "SELECT status FROM meeting_requests WHERE id = $1 AND organization_id = $2"
    )
    .bind(meeting_id)
    .bind(tenant.organization_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Meeting not found".to_string()))?;

    if meeting_status == "completed" || meeting_status == "cancelled" {
        return Err(AppError::Conflict("Meeting is already ended".to_string()));
    }

    sqlx::query(
        "UPDATE meeting_requests SET status = 'completed', ended_at = $1, updated_at = $1 WHERE id = $2"
    )
    .bind(now)
    .bind(meeting_id)
    .execute(&state.db)
    .await?;

    let reason = body.reason.unwrap_or_else(|| "manual_end".to_string());

    sqlx::query(
        "INSERT INTO meeting_events (id, meeting_id, organization_id, actor_user_id, event_type, correlation_id, payload_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'meeting_ended', $5, $6, $7, $7)"
    )
    .bind(Uuid::now_v7())
    .bind(meeting_id)
    .bind(tenant.organization_id)
    .bind(auth.id)
    .bind(&correlation_id)
    .bind(serde_json::json!({ "reason": reason, "source": "manual" }))
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok(Json(EndMeetingResponse {
        meeting_id,
        status: "completed".to_string(),
        ended_at: now,
    }))
}

// ─── POST /v1/video/webhook ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ProviderWebhookEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub created_at: Option<String>,
    pub data: Option<serde_json::Value>,
}

pub async fn video_provider_webhook(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<ProviderWebhookEvent>,
) -> AppResult<StatusCode> {
    let correlation_id = headers
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    let signature = headers
        .get("x-video-signature")
        .and_then(|v| v.to_str().ok());

    if signature.is_none() {
        return Err(AppError::Unauthorized("Missing webhook signature".to_string()));
    }

    // TODO: Implement real HMAC verification against VIDEO_WEBHOOK_SECRET
    // let expected = hmac_sha256(secret, raw_body);
    // if !constant_time_eq(signature, expected) { return Err(...) }

    let idempotency_key = format!("video_webhook:{}", body.id);
    let existing = sqlx::query_scalar::<_, String>(
        "SELECT key FROM idempotency_keys WHERE key = $1"
    )
    .bind(&idempotency_key)
    .fetch_optional(&state.db)
    .await?;

    if existing.is_some() {
        return Ok(StatusCode::OK);
    }

    let data = body.data.unwrap_or(serde_json::json!({}));
    let room_name = data.get("roomName").and_then(|v| v.as_str());
    let user_id_str = data.get("userId").and_then(|v| v.as_str());

    let room_name = match room_name {
        Some(n) => n.to_string(),
        None => {
            tracing::warn!(event_id = %body.id, event_type = %body.event_type, "Webhook event missing roomName, skipping");
            return Ok(StatusCode::OK);
        }
    };

    let meeting = sqlx::query_as::<_, (Uuid, Uuid, String)>(
        "SELECT id, organization_id, status FROM meeting_requests WHERE provider_room_name = $1"
    )
    .bind(&room_name)
    .fetch_optional(&state.db)
    .await?;

    let meeting = match meeting {
        Some(m) => m,
        None => {
            tracing::warn!(room_name = %room_name, "No meeting found for provider room name");
            return Ok(StatusCode::OK);
        }
    };

    let now = chrono::Utc::now();
    let expires_at = now + chrono::Duration::days(7);

    sqlx::query(
        "INSERT INTO idempotency_keys (key, scope, expires_at, created_at) VALUES ($1, 'video_webhook', $2, $3)"
    )
    .bind(&idempotency_key)
    .bind(expires_at)
    .bind(now)
    .execute(&state.db)
    .await?;

    let user_id = user_id_str.and_then(|s| Uuid::parse_str(s).ok());

    match body.event_type.as_str() {
        "participant_joined" => {
            if let Some(uid) = user_id {
                sqlx::query(
                    "UPDATE meeting_participants SET attendance_status = 'joined', joined_at = $1
                     WHERE meeting_id = $2 AND user_id = $3"
                )
                .bind(now).bind(meeting.0).bind(uid)
                .execute(&state.db).await?;
            }

            if meeting.2 != "completed" {
                sqlx::query("UPDATE meeting_requests SET status = 'accepted', updated_at = $1 WHERE id = $2 AND status != 'completed'")
                    .bind(now).bind(meeting.0)
                    .execute(&state.db).await?;

                sqlx::query(
                    "INSERT INTO meeting_events (id, meeting_id, organization_id, actor_user_id, event_type, correlation_id, payload_json, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, 'meeting_started', $5, $6, $7, $7)"
                )
                .bind(Uuid::now_v7()).bind(meeting.0).bind(meeting.1)
                .bind(user_id)
                .bind(&correlation_id)
                .bind(serde_json::json!({ "provider_event_id": body.id }))
                .bind(now)
                .execute(&state.db).await?;
            }
        }
        "participant_left" => {
            if let Some(uid) = user_id {
                sqlx::query(
                    "UPDATE meeting_participants SET attendance_status = 'left', left_at = $1
                     WHERE meeting_id = $2 AND user_id = $3"
                )
                .bind(now).bind(meeting.0).bind(uid)
                .execute(&state.db).await?;
            }
        }
        "room_finished" => {
            sqlx::query("UPDATE meeting_requests SET status = 'completed', ended_at = $1, updated_at = $1 WHERE id = $2")
                .bind(now).bind(meeting.0)
                .execute(&state.db).await?;

            sqlx::query(
                "INSERT INTO meeting_events (id, meeting_id, organization_id, actor_user_id, event_type, correlation_id, payload_json, created_at, updated_at)
                 VALUES ($1, $2, $3, NULL, 'meeting_ended', $4, $5, $6, $6)"
            )
            .bind(Uuid::now_v7()).bind(meeting.0).bind(meeting.1)
            .bind(&correlation_id)
            .bind(serde_json::json!({ "provider_event_id": body.id, "source": "provider" }))
            .bind(now)
            .execute(&state.db).await?;
        }
        _ => {
            tracing::debug!(event_type = %body.event_type, "Unhandled webhook event type");
        }
    }

    sqlx::query(
        "INSERT INTO meeting_events (id, meeting_id, organization_id, actor_user_id, event_type, correlation_id, payload_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'webhook_reconciled', $5, $6, $7, $7)"
    )
    .bind(Uuid::now_v7()).bind(meeting.0).bind(meeting.1)
    .bind(user_id)
    .bind(&correlation_id)
    .bind(serde_json::json!({ "provider_event_id": body.id, "event_type": body.event_type }))
    .bind(now)
    .execute(&state.db).await?;

    Ok(StatusCode::OK)
}
