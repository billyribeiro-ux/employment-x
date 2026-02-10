use redis::aio::ConnectionManager;
use sqlx::PgPool;

use crate::config::AppConfig;

#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub db: PgPool,
    pub redis: ConnectionManager,
}

impl AppState {
    pub fn new(config: AppConfig, db: PgPool, redis: ConnectionManager) -> Self {
        Self { config, db, redis }
    }
}
