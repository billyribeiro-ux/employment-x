use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::EnvFilter;

use crate::config::AppConfig;

pub fn init(config: &AppConfig) -> anyhow::Result<()> {
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        EnvFilter::new("employmentx_api=debug,tower_http=debug,sqlx=warn")
    });

    let fmt_layer = tracing_subscriber::fmt::layer()
        .json()
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true);

    let registry = tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer);

    if let Some(ref dsn) = config.sentry_dsn {
        if !dsn.is_empty() {
            let _guard = sentry::init(sentry::ClientOptions {
                dsn: dsn.parse().ok(),
                release: sentry::release_name!(),
                environment: Some(config.environment.clone().into()),
                traces_sample_rate: if config.is_production() { 0.1 } else { 1.0 },
                ..Default::default()
            });

            let sentry_layer = sentry::integrations::tracing::layer();
            registry.with(sentry_layer).init();
            return Ok(());
        }
    }

    registry.init();
    Ok(())
}
