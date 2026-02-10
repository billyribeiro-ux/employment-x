use std::sync::Arc;

use axum::extract::State;
use axum::Extension;
use axum::Json;
use serde::Serialize;

use crate::error::AppResult;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct FeatureFlagResponse {
    pub key: String,
    pub enabled: bool,
    pub variant: Option<String>,
}

fn default_flags() -> Vec<FeatureFlagResponse> {
    vec![
        FeatureFlagResponse { key: "demo_mode_enabled".into(), enabled: false, variant: None },
        FeatureFlagResponse { key: "advanced_shortcuts_enabled".into(), enabled: false, variant: None },
        FeatureFlagResponse { key: "pip_interview_enabled".into(), enabled: false, variant: None },
        FeatureFlagResponse { key: "ai_assist_enabled".into(), enabled: false, variant: None },
        FeatureFlagResponse { key: "billing_metering_enabled".into(), enabled: true, variant: None },
    ]
}

pub async fn get_all(
    State(_state): State<Arc<AppState>>,
    Extension(_auth): Extension<AuthUser>,
) -> AppResult<Json<serde_json::Value>> {
    let flags = default_flags();
    Ok(Json(serde_json::json!({ "data": flags })))
}
