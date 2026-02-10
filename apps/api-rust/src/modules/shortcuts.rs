use std::sync::Arc;

use axum::extract::State;
use axum::Extension;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppResult;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct ShortcutProfileResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub is_default: bool,
    pub bindings: Vec<ShortcutBindingResponse>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShortcutBindingResponse {
    pub id: String,
    pub action: String,
    pub label: String,
    pub description: String,
    pub keys: String,
    pub scope: String,
    pub sequence: bool,
    pub enabled: bool,
}

fn default_bindings() -> Vec<ShortcutBindingResponse> {
    vec![
        ShortcutBindingResponse { id: "cmd_palette".into(), action: "open_command_palette".into(), label: "Command Palette".into(), description: "Open command palette".into(), keys: "mod+k".into(), scope: "global".into(), sequence: false, enabled: true },
        ShortcutBindingResponse { id: "nav_candidates".into(), action: "navigate_candidates".into(), label: "Go to Candidates".into(), description: "Navigate to candidates".into(), keys: "g c".into(), scope: "global".into(), sequence: true, enabled: true },
        ShortcutBindingResponse { id: "nav_jobs".into(), action: "navigate_jobs".into(), label: "Go to Jobs".into(), description: "Navigate to jobs".into(), keys: "g j".into(), scope: "global".into(), sequence: true, enabled: true },
        ShortcutBindingResponse { id: "nav_messages".into(), action: "navigate_messages".into(), label: "Go to Messages".into(), description: "Navigate to messages".into(), keys: "g m".into(), scope: "global".into(), sequence: true, enabled: true },
        ShortcutBindingResponse { id: "nav_scheduling".into(), action: "navigate_scheduling".into(), label: "Go to Scheduling".into(), description: "Navigate to scheduling".into(), keys: "g s".into(), scope: "global".into(), sequence: true, enabled: true },
        ShortcutBindingResponse { id: "accept_meeting".into(), action: "accept_meeting".into(), label: "Accept Meeting".into(), description: "Accept meeting request".into(), keys: "shift+a".into(), scope: "page".into(), sequence: false, enabled: true },
        ShortcutBindingResponse { id: "deny_meeting".into(), action: "deny_meeting".into(), label: "Deny Meeting".into(), description: "Deny meeting request".into(), keys: "shift+d".into(), scope: "page".into(), sequence: false, enabled: true },
        ShortcutBindingResponse { id: "reschedule_meeting".into(), action: "reschedule_meeting".into(), label: "Reschedule Meeting".into(), description: "Reschedule meeting request".into(), keys: "shift+r".into(), scope: "page".into(), sequence: false, enabled: true },
    ]
}

pub async fn get_profile(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
) -> AppResult<Json<ShortcutProfileResponse>> {
    let row = sqlx::query_as::<_, (Uuid, String, bool, serde_json::Value)>(
        "SELECT id, name, is_default, bindings FROM shortcut_profiles WHERE user_id = $1 LIMIT 1"
    )
    .bind(auth.id)
    .fetch_optional(&state.db).await?;

    match row {
        Some(r) => {
            let bindings: Vec<ShortcutBindingResponse> = serde_json::from_value(r.3).unwrap_or_default();
            Ok(Json(ShortcutProfileResponse {
                id: r.0, user_id: auth.id, name: r.1, is_default: r.2, bindings,
            }))
        }
        None => {
            let id = Uuid::now_v7();
            let bindings = default_bindings();
            let bindings_json = serde_json::to_value(&bindings).unwrap_or_default();
            let now = chrono::Utc::now();

            sqlx::query(
                "INSERT INTO shortcut_profiles (id, user_id, organization_id, name, is_default, bindings, created_at, updated_at)
                 VALUES ($1, $2, $3, 'Default', true, $4, $5, $5)"
            )
            .bind(id).bind(auth.id).bind(auth.organization_id).bind(&bindings_json).bind(now)
            .execute(&state.db).await?;

            Ok(Json(ShortcutProfileResponse {
                id, user_id: auth.id, name: "Default".to_string(), is_default: true, bindings,
            }))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateBindingsRequest {
    pub bindings: Vec<BindingUpdate>,
}

#[derive(Debug, Deserialize)]
pub struct BindingUpdate {
    pub id: String,
    pub keys: Option<String>,
    pub enabled: Option<bool>,
}

pub async fn update_bindings(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Json(body): Json<UpdateBindingsRequest>,
) -> AppResult<Json<ShortcutProfileResponse>> {
    let profile = sqlx::query_as::<_, (Uuid, serde_json::Value)>(
        "SELECT id, bindings FROM shortcut_profiles WHERE user_id = $1 LIMIT 1"
    )
    .bind(auth.id)
    .fetch_optional(&state.db).await?;

    let (profile_id, mut bindings) = match profile {
        Some(p) => {
            let b: Vec<ShortcutBindingResponse> = serde_json::from_value(p.1).unwrap_or_default();
            (p.0, b)
        }
        None => {
            let id = Uuid::now_v7();
            (id, default_bindings())
        }
    };

    for update in &body.bindings {
        if let Some(binding) = bindings.iter_mut().find(|b| b.id == update.id) {
            if let Some(ref keys) = update.keys {
                binding.keys = keys.clone();
            }
            if let Some(enabled) = update.enabled {
                binding.enabled = enabled;
            }
        }
    }

    let bindings_json = serde_json::to_value(&bindings).unwrap_or_default();
    let now = chrono::Utc::now();

    sqlx::query("UPDATE shortcut_profiles SET bindings = $2, updated_at = $3 WHERE id = $1")
        .bind(profile_id).bind(&bindings_json).bind(now)
        .execute(&state.db).await?;

    Ok(Json(ShortcutProfileResponse {
        id: profile_id, user_id: auth.id, name: "Default".to_string(), is_default: true, bindings,
    }))
}

#[derive(Debug, Deserialize)]
pub struct TrackUsageRequest {
    pub events: Vec<UsageEvent>,
}

#[derive(Debug, Deserialize)]
pub struct UsageEvent {
    pub shortcut_id: String,
    pub action: String,
    pub scope: String,
    pub page: String,
}

pub async fn track_usage(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Json(body): Json<TrackUsageRequest>,
) -> AppResult<axum::http::StatusCode> {
    let now = chrono::Utc::now();
    for event in &body.events {
        sqlx::query(
            "INSERT INTO shortcut_usage_events (id, user_id, shortcut_id, action, scope, page, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)"
        )
        .bind(Uuid::now_v7()).bind(auth.id)
        .bind(&event.shortcut_id).bind(&event.action).bind(&event.scope).bind(&event.page).bind(now)
        .execute(&state.db).await?;
    }
    Ok(axum::http::StatusCode::CREATED)
}
