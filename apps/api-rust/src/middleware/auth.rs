use std::sync::Arc;

use axum::extract::State;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use chrono::Utc;
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub role: String,
    pub org_id: Option<Uuid>,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub organization_id: Option<Uuid>,
}

impl AuthUser {
    pub fn require_org(&self) -> AppResult<Uuid> {
        self.organization_id
            .ok_or_else(|| AppError::Forbidden("Organization membership required".to_string()))
    }

    pub fn has_role(&self, role: &str) -> bool {
        self.role == role
    }

    pub fn require_role(&self, role: &str) -> AppResult<()> {
        if self.role == role {
            Ok(())
        } else {
            Err(AppError::Forbidden(format!(
                "Role '{}' required, got '{}'",
                role, self.role
            )))
        }
    }

    pub fn require_any_role(&self, roles: &[&str]) -> AppResult<()> {
        if roles.contains(&self.role.as_str()) {
            Ok(())
        } else {
            Err(AppError::Forbidden(format!(
                "One of roles {:?} required, got '{}'",
                roles, self.role
            )))
        }
    }
}

pub async fn require_auth<B>(
    State(state): State<Arc<AppState>>,
    mut request: Request<B>,
    next: Next<B>,
) -> Result<Response, AppError> {
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    let validation = Validation::default();
    let key = DecodingKey::from_secret(state.config.jwt_secret.as_bytes());

    let token_data = decode::<Claims>(token, &key, &validation)
        .map_err(|_| AppError::Unauthorized)?;

    let claims = token_data.claims;

    if claims.exp < Utc::now().timestamp() {
        return Err(AppError::Unauthorized);
    }

    let auth_user = AuthUser {
        id: claims.sub,
        email: claims.email,
        role: claims.role,
        organization_id: claims.org_id,
    };

    request.extensions_mut().insert(auth_user);
    Ok(next.run(request).await)
}

pub fn create_token(
    jwt_secret: &str,
    user_id: Uuid,
    email: &str,
    role: &str,
    org_id: Option<Uuid>,
    expiry_seconds: u64,
) -> AppResult<String> {
    let now = Utc::now().timestamp();
    let claims = Claims {
        sub: user_id,
        email: email.to_string(),
        role: role.to_string(),
        org_id,
        exp: now + expiry_seconds as i64,
        iat: now,
    };

    let key = jsonwebtoken::EncodingKey::from_secret(jwt_secret.as_bytes());
    let token = jsonwebtoken::encode(&jsonwebtoken::Header::default(), &claims, &key)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Token encoding failed: {}", e)))?;

    Ok(token)
}
