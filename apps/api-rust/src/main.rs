use std::net::SocketAddr;
use std::sync::Arc;

use tokio::net::TcpListener;
use tracing::info;

mod config;
mod db;
mod error;
mod middleware;
mod modules;
mod router;
mod state;
mod telemetry;

use crate::config::AppConfig;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = AppConfig::load()?;

    telemetry::init(&config)?;

    let db_pool = db::create_pool(&config.database_url).await?;
    let redis = db::create_redis_pool(&config.redis_url).await?;

    sqlx::migrate!("../../infra/migrations").run(&db_pool).await?;

    let state = Arc::new(AppState::new(config.clone(), db_pool, redis));
    let app = router::create_router(state);

    let addr: SocketAddr = config.listen_addr.parse()?;
    let listener = TcpListener::bind(addr).await?;
    info!("EmploymentX API listening on {}", addr);

    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .await?;

    Ok(())
}
