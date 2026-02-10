use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub jwt_expiry_seconds: u64,
    pub refresh_token_expiry_seconds: u64,
    pub listen_addr: String,
    pub sentry_dsn: Option<String>,
    pub otel_exporter_otlp_endpoint: Option<String>,
    pub stripe_secret_key: String,
    pub stripe_webhook_secret: String,
    pub environment: String,
}

impl AppConfig {
    pub fn load() -> anyhow::Result<Self> {
        let config = config::Config::builder()
            .set_default("listen_addr", "0.0.0.0:8080")?
            .set_default("jwt_expiry_seconds", 3600_i64)?
            .set_default("refresh_token_expiry_seconds", 604800_i64)?
            .set_default("environment", "development")?
            .add_source(config::Environment::default())
            .build()?;

        let app_config: AppConfig = config.try_deserialize()?;
        Ok(app_config)
    }

    pub fn is_production(&self) -> bool {
        self.environment == "production"
    }
}
