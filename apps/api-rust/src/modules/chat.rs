use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Extension;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct ConversationResponse {
    pub id: Uuid,
    pub subject: Option<String>,
    pub conversation_type: String,
    pub last_message_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub sender_id: Uuid,
    pub body: String,
    pub reply_to_id: Option<Uuid>,
    pub is_edited: bool,
    pub is_deleted: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateConversationRequest {
    pub participant_ids: Vec<Uuid>,
    pub subject: Option<String>,
    pub initial_message: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub body: String,
    pub reply_to_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn create_conversation(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Json(body): Json<CreateConversationRequest>,
) -> AppResult<(StatusCode, Json<ConversationResponse>)> {
    let id = Uuid::now_v7();
    let now = chrono::Utc::now();
    let conv_type = if body.participant_ids.len() > 1 { "group" } else { "direct" };

    sqlx::query(
        "INSERT INTO conversations (id, organization_id, subject, conversation_type, last_message_at, is_archived, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NULL, false, $5, $5)"
    )
    .bind(id).bind(auth.organization_id).bind(&body.subject).bind(conv_type).bind(now)
    .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO conversation_participants (id, conversation_id, user_id, joined_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4, $4)"
    )
    .bind(Uuid::now_v7()).bind(id).bind(auth.id).bind(now)
    .execute(&state.db).await?;

    for pid in &body.participant_ids {
        sqlx::query(
            "INSERT INTO conversation_participants (id, conversation_id, user_id, joined_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $4, $4)"
        )
        .bind(Uuid::now_v7()).bind(id).bind(pid).bind(now)
        .execute(&state.db).await?;
    }

    if let Some(ref msg) = body.initial_message {
        let msg_id = Uuid::now_v7();
        sqlx::query(
            "INSERT INTO messages (id, conversation_id, sender_id, body, reply_to_id, is_edited, is_deleted, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NULL, false, false, $5, $5)"
        )
        .bind(msg_id).bind(id).bind(auth.id).bind(msg).bind(now)
        .execute(&state.db).await?;

        sqlx::query("UPDATE conversations SET last_message_at = $2 WHERE id = $1")
            .bind(id).bind(now)
            .execute(&state.db).await?;
    }

    Ok((StatusCode::CREATED, Json(ConversationResponse {
        id, subject: body.subject, conversation_type: conv_type.to_string(),
        last_message_at: None, created_at: now,
    })))
}

pub async fn list_conversations(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Query(params): Query<PaginationParams>,
) -> AppResult<Json<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(25).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let rows = sqlx::query_as::<_, (Uuid, Option<String>, String, Option<chrono::DateTime<chrono::Utc>>, chrono::DateTime<chrono::Utc>)>(
        "SELECT c.id, c.subject, c.conversation_type, c.last_message_at, c.created_at
         FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id = c.id
         WHERE cp.user_id = $1 AND c.is_archived = false
         ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
         LIMIT $2 OFFSET $3"
    )
    .bind(auth.id).bind(per_page).bind(offset)
    .fetch_all(&state.db).await?;

    let data: Vec<ConversationResponse> = rows.into_iter().map(|r| ConversationResponse {
        id: r.0, subject: r.1, conversation_type: r.2, last_message_at: r.3, created_at: r.4,
    }).collect();

    Ok(Json(serde_json::json!({ "data": data })))
}

pub async fn get_messages(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(conversation_id): Path<Uuid>,
    Query(params): Query<PaginationParams>,
) -> AppResult<Json<serde_json::Value>> {
    let is_participant = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2"
    )
    .bind(conversation_id).bind(auth.id)
    .fetch_one(&state.db).await?;

    if is_participant == 0 {
        return Err(AppError::Forbidden("Not a participant".to_string()));
    }

    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(50).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let rows = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, Option<Uuid>, bool, bool, chrono::DateTime<chrono::Utc>)>(
        "SELECT id, conversation_id, sender_id, body, reply_to_id, is_edited, is_deleted, created_at
         FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(conversation_id).bind(per_page).bind(offset)
    .fetch_all(&state.db).await?;

    let data: Vec<MessageResponse> = rows.into_iter().map(|r| MessageResponse {
        id: r.0, conversation_id: r.1, sender_id: r.2, body: r.3,
        reply_to_id: r.4, is_edited: r.5, is_deleted: r.6, created_at: r.7,
    }).collect();

    Ok(Json(serde_json::json!({ "data": data })))
}

pub async fn send_message(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(conversation_id): Path<Uuid>,
    Json(body): Json<SendMessageRequest>,
) -> AppResult<(StatusCode, Json<MessageResponse>)> {
    let is_participant = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2"
    )
    .bind(conversation_id).bind(auth.id)
    .fetch_one(&state.db).await?;

    if is_participant == 0 {
        return Err(AppError::Forbidden("Not a participant".to_string()));
    }

    let id = Uuid::now_v7();
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO messages (id, conversation_id, sender_id, body, reply_to_id, is_edited, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, false, false, $6, $6)"
    )
    .bind(id).bind(conversation_id).bind(auth.id).bind(&body.body).bind(body.reply_to_id).bind(now)
    .execute(&state.db).await?;

    sqlx::query("UPDATE conversations SET last_message_at = $2, updated_at = $2 WHERE id = $1")
        .bind(conversation_id).bind(now)
        .execute(&state.db).await?;

    Ok((StatusCode::CREATED, Json(MessageResponse {
        id, conversation_id, sender_id: auth.id, body: body.body,
        reply_to_id: body.reply_to_id, is_edited: false, is_deleted: false, created_at: now,
    })))
}

pub async fn mark_read(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(conversation_id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let now = chrono::Utc::now();
    sqlx::query(
        "INSERT INTO message_receipts (id, message_id, user_id, read_at)
         SELECT $1, m.id, $2, $3
         FROM messages m
         WHERE m.conversation_id = $4
         AND NOT EXISTS (SELECT 1 FROM message_receipts mr WHERE mr.message_id = m.id AND mr.user_id = $2)
         LIMIT 1000"
    )
    .bind(Uuid::now_v7()).bind(auth.id).bind(now).bind(conversation_id)
    .execute(&state.db).await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn upload_attachment(
    State(_state): State<Arc<AppState>>,
    Extension(_auth): Extension<AuthUser>,
    Path(_conversation_id): Path<Uuid>,
) -> AppResult<StatusCode> {
    Ok(StatusCode::CREATED)
}
