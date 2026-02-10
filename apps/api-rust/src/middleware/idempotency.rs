use std::sync::Arc;

use axum::http::StatusCode;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::state::AppState;

const IDEMPOTENCY_TTL_SECONDS: u64 = 86400;

#[derive(Debug, Serialize, Deserialize)]
pub struct IdempotencyRecord {
    pub key: String,
    pub tenant_id: Uuid,
    pub request_fingerprint: String,
    pub status_code: u16,
    pub response_body: String,
}

pub fn compute_fingerprint(body: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(body);
    hex::encode(hasher.finalize())
}

fn redis_key(tenant_id: Uuid, idempotency_key: &str) -> String {
    format!("idempotency:{}:{}", tenant_id, idempotency_key)
}

pub async fn check_idempotency(
    state: &Arc<AppState>,
    tenant_id: Uuid,
    idempotency_key: &str,
    request_fingerprint: &str,
) -> AppResult<Option<(StatusCode, String)>> {
    let key = redis_key(tenant_id, idempotency_key);
    let mut conn = state.redis.clone();

    let stored: Option<String> = conn.get(&key).await?;

    match stored {
        Some(data) => {
            let record: IdempotencyRecord = serde_json::from_str(&data)
                .map_err(|e| AppError::Internal(anyhow::anyhow!("Idempotency parse error: {}", e)))?;

            if record.request_fingerprint != request_fingerprint {
                return Err(AppError::IdempotencyConflict);
            }

            let status = StatusCode::from_u16(record.status_code)
                .unwrap_or(StatusCode::OK);
            Ok(Some((status, record.response_body)))
        }
        None => Ok(None),
    }
}

pub async fn store_idempotency(
    state: &Arc<AppState>,
    tenant_id: Uuid,
    idempotency_key: &str,
    request_fingerprint: &str,
    status_code: StatusCode,
    response_body: &str,
) -> AppResult<()> {
    let key = redis_key(tenant_id, idempotency_key);
    let mut conn = state.redis.clone();

    let record = IdempotencyRecord {
        key: idempotency_key.to_string(),
        tenant_id,
        request_fingerprint: request_fingerprint.to_string(),
        status_code: status_code.as_u16(),
        response_body: response_body.to_string(),
    };

    let serialized = serde_json::to_string(&record)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Idempotency serialize error: {}", e)))?;

    conn.set_ex(&key, &serialized, IDEMPOTENCY_TTL_SECONDS).await?;
    Ok(())
}
