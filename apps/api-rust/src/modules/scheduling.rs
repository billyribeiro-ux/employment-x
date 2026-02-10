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

#[derive(Debug, Serialize)]
pub struct MeetingResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub requester_id: Uuid,
    pub title: String,
    pub status: String,
    pub meeting_type: String,
    pub duration_minutes: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMeetingRequest {
    pub title: String,
    pub description: Option<String>,
    pub participant_ids: Vec<Uuid>,
    pub meeting_type: String,
    pub timezone: String,
    pub duration_minutes: i32,
    pub proposed_slots: Vec<ProposedSlot>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ProposedSlot {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Deserialize)]
pub struct AcceptRequest {
    pub selected_slot: ProposedSlot,
}

#[derive(Debug, Deserialize)]
pub struct DenyRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RescheduleRequest {
    pub reason: Option<String>,
    pub proposed_slots: Vec<ProposedSlot>,
}

#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn create_meeting(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Json(body): Json<CreateMeetingRequest>,
) -> AppResult<(StatusCode, Json<MeetingResponse>)> {
    let tenant = TenantContext::from_auth(&auth)?;

    let id = Uuid::now_v7();
    let now = chrono::Utc::now();
    let slots_json = serde_json::to_value(&body.proposed_slots)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Serialization error: {}", e)))?;

    sqlx::query(
        "INSERT INTO meeting_requests (id, organization_id, requester_id, title, description, status, meeting_type, timezone, duration_minutes, proposed_slots, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $10)"
    )
    .bind(id).bind(tenant.organization_id).bind(auth.id)
    .bind(&body.title).bind(&body.description)
    .bind(&body.meeting_type).bind(&body.timezone).bind(body.duration_minutes)
    .bind(&slots_json).bind(now)
    .execute(&state.db).await?;

    for pid in &body.participant_ids {
        sqlx::query(
            "INSERT INTO meeting_participants (id, meeting_id, user_id, role, created_at, updated_at)
             VALUES ($1, $2, $3, 'participant', $4, $4)"
        )
        .bind(Uuid::now_v7()).bind(id).bind(pid).bind(now)
        .execute(&state.db).await?;
    }

    sqlx::query(
        "INSERT INTO audit_events (id, organization_id, user_id, event_type, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, 'meeting.created', 'meeting', $4, '{}', $5)"
    )
    .bind(Uuid::now_v7()).bind(tenant.organization_id).bind(auth.id).bind(id).bind(now)
    .execute(&state.db).await?;

    Ok((StatusCode::CREATED, Json(MeetingResponse {
        id, organization_id: tenant.organization_id, requester_id: auth.id,
        title: body.title, status: "pending".to_string(), meeting_type: body.meeting_type,
        duration_minutes: body.duration_minutes, created_at: now, updated_at: now,
    })))
}

pub async fn accept_meeting(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<AcceptRequest>,
) -> AppResult<Json<MeetingResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;

    let meeting = sqlx::query_as::<_, (Uuid, String, String, String, i32, chrono::DateTime<chrono::Utc>)>(
        "SELECT organization_id, title, status, meeting_type, duration_minutes, created_at FROM meeting_requests WHERE id = $1"
    )
    .bind(id).fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound("Meeting not found".to_string()))?;

    tenant.can_write(meeting.0)?;

    if meeting.2 != "pending" {
        return Err(AppError::Conflict(format!("Meeting is {}, cannot accept", meeting.2)));
    }

    let now = chrono::Utc::now();
    let slot_json = serde_json::to_value(&body.selected_slot)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Serialization error: {}", e)))?;

    sqlx::query("UPDATE meeting_requests SET status = 'accepted', confirmed_slot = $2, updated_at = $3 WHERE id = $1")
        .bind(id).bind(&slot_json).bind(now)
        .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO meeting_status_events (id, meeting_id, from_status, to_status, changed_by, created_at)
         VALUES ($1, $2, 'pending', 'accepted', $3, $4)"
    )
    .bind(Uuid::now_v7()).bind(id).bind(auth.id).bind(now)
    .execute(&state.db).await?;

    let participants = sqlx::query_scalar::<_, Uuid>(
        "SELECT user_id FROM meeting_participants WHERE meeting_id = $1"
    ).bind(id).fetch_all(&state.db).await?;

    for uid in &participants {
        for reminder_type in &["t_minus_24h", "t_minus_1h", "t_minus_10m"] {
            sqlx::query(
                "INSERT INTO reminder_jobs (id, meeting_id, organization_id, user_id, remind_at, reminder_type, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $7)"
            )
            .bind(Uuid::now_v7()).bind(id).bind(meeting.0).bind(uid)
            .bind(now).bind(reminder_type).bind(now)
            .execute(&state.db).await?;
        }
    }

    sqlx::query(
        "INSERT INTO audit_events (id, organization_id, user_id, event_type, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, 'meeting.accepted', 'meeting', $4, '{}', $5)"
    )
    .bind(Uuid::now_v7()).bind(meeting.0).bind(auth.id).bind(id).bind(now)
    .execute(&state.db).await?;

    Ok(Json(MeetingResponse {
        id, organization_id: meeting.0, requester_id: auth.id,
        title: meeting.1, status: "accepted".to_string(), meeting_type: meeting.3,
        duration_minutes: meeting.4, created_at: meeting.5, updated_at: now,
    }))
}

pub async fn deny_meeting(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<DenyRequest>,
) -> AppResult<Json<MeetingResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;

    let meeting = sqlx::query_as::<_, (Uuid, String, String, String, i32, chrono::DateTime<chrono::Utc>)>(
        "SELECT organization_id, title, status, meeting_type, duration_minutes, created_at FROM meeting_requests WHERE id = $1"
    )
    .bind(id).fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound("Meeting not found".to_string()))?;

    tenant.can_write(meeting.0)?;

    if meeting.2 != "pending" {
        return Err(AppError::Conflict(format!("Meeting is {}, cannot deny", meeting.2)));
    }

    let now = chrono::Utc::now();

    sqlx::query("UPDATE meeting_requests SET status = 'denied', deny_reason = $2, updated_at = $3 WHERE id = $1")
        .bind(id).bind(&body.reason).bind(now)
        .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO meeting_status_events (id, meeting_id, from_status, to_status, changed_by, created_at)
         VALUES ($1, $2, 'pending', 'denied', $3, $4)"
    )
    .bind(Uuid::now_v7()).bind(id).bind(auth.id).bind(now)
    .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO audit_events (id, organization_id, user_id, event_type, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, 'meeting.denied', 'meeting', $4, '{}', $5)"
    )
    .bind(Uuid::now_v7()).bind(meeting.0).bind(auth.id).bind(id).bind(now)
    .execute(&state.db).await?;

    Ok(Json(MeetingResponse {
        id, organization_id: meeting.0, requester_id: auth.id,
        title: meeting.1, status: "denied".to_string(), meeting_type: meeting.3,
        duration_minutes: meeting.4, created_at: meeting.5, updated_at: now,
    }))
}

pub async fn reschedule_meeting(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<RescheduleRequest>,
) -> AppResult<Json<MeetingResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;

    let meeting = sqlx::query_as::<_, (Uuid, String, String, String, i32, chrono::DateTime<chrono::Utc>)>(
        "SELECT organization_id, title, status, meeting_type, duration_minutes, created_at FROM meeting_requests WHERE id = $1"
    )
    .bind(id).fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound("Meeting not found".to_string()))?;

    tenant.can_write(meeting.0)?;

    let now = chrono::Utc::now();
    let slots_json = serde_json::to_value(&body.proposed_slots)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Serialization error: {}", e)))?;

    sqlx::query("UPDATE meeting_requests SET status = 'rescheduled', proposed_slots = $2, confirmed_slot = NULL, updated_at = $3 WHERE id = $1")
        .bind(id).bind(&slots_json).bind(now)
        .execute(&state.db).await?;

    sqlx::query("UPDATE reminder_jobs SET status = 'cancelled', updated_at = $2 WHERE meeting_id = $1 AND status = 'scheduled'")
        .bind(id).bind(now)
        .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO meeting_reschedule_events (id, meeting_id, rescheduled_by, reason, new_proposed_slots, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(Uuid::now_v7()).bind(id).bind(auth.id).bind(&body.reason).bind(&slots_json).bind(now)
    .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO audit_events (id, organization_id, user_id, event_type, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, 'meeting.rescheduled', 'meeting', $4, '{}', $5)"
    )
    .bind(Uuid::now_v7()).bind(meeting.0).bind(auth.id).bind(id).bind(now)
    .execute(&state.db).await?;

    Ok(Json(MeetingResponse {
        id, organization_id: meeting.0, requester_id: auth.id,
        title: meeting.1, status: "rescheduled".to_string(), meeting_type: meeting.3,
        duration_minutes: meeting.4, created_at: meeting.5, updated_at: now,
    }))
}

pub async fn get_meeting(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<MeetingResponse>> {
    let r = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, String, i32, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        "SELECT id, organization_id, requester_id, title, status, meeting_type, duration_minutes, created_at, updated_at FROM meeting_requests WHERE id = $1"
    )
    .bind(id).fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound("Meeting not found".to_string()))?;

    if let Some(org_id) = auth.organization_id {
        if r.1 != org_id {
            return Err(AppError::NotFound("Meeting not found".to_string()));
        }
    }

    Ok(Json(MeetingResponse {
        id: r.0, organization_id: r.1, requester_id: r.2, title: r.3,
        status: r.4, meeting_type: r.5, duration_minutes: r.6,
        created_at: r.7, updated_at: r.8,
    }))
}

pub async fn list_meetings(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Query(params): Query<ListParams>,
) -> AppResult<Json<serde_json::Value>> {
    let tenant = TenantContext::from_auth(&auth)?;
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(25).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let rows = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, String, i32, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        "SELECT id, organization_id, requester_id, title, status, meeting_type, duration_minutes, created_at, updated_at
         FROM meeting_requests WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(tenant.organization_id).bind(per_page).bind(offset)
    .fetch_all(&state.db).await?;

    let data: Vec<MeetingResponse> = rows.into_iter().map(|r| MeetingResponse {
        id: r.0, organization_id: r.1, requester_id: r.2, title: r.3,
        status: r.4, meeting_type: r.5, duration_minutes: r.6,
        created_at: r.7, updated_at: r.8,
    }).collect();

    Ok(Json(serde_json::json!({ "data": data })))
}
