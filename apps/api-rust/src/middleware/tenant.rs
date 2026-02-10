use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthUser;

#[derive(Debug, Clone)]
pub struct TenantContext {
    pub organization_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
}

impl TenantContext {
    pub fn from_auth(auth: &AuthUser) -> AppResult<Self> {
        let org_id = auth.require_org()?;
        Ok(Self {
            organization_id: org_id,
            user_id: auth.id,
            role: auth.role.clone(),
        })
    }

    pub fn can_read(&self, resource_org_id: Uuid) -> AppResult<()> {
        if self.organization_id != resource_org_id {
            return Err(AppError::NotFound("Resource not found".to_string()));
        }
        Ok(())
    }

    pub fn can_write(&self, resource_org_id: Uuid) -> AppResult<()> {
        if self.organization_id != resource_org_id {
            return Err(AppError::NotFound("Resource not found".to_string()));
        }
        Ok(())
    }

    pub fn require_role(&self, allowed: &[&str]) -> AppResult<()> {
        if allowed.contains(&self.role.as_str()) {
            Ok(())
        } else {
            Err(AppError::Forbidden(format!(
                "Insufficient permissions. Required: {:?}",
                allowed
            )))
        }
    }
}
