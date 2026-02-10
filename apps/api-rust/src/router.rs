use std::sync::Arc;
use std::time::Duration;

use axum::middleware as axum_mw;
use axum::routing::{get, patch, post};
use axum::Router;
use tower_http::compression::CompressionLayer;
use tower_http::cors::{Any, CorsLayer};
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;

use crate::middleware::request_id::inject_request_id;
use crate::modules;
use crate::state::AppState;

pub fn create_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let public_routes = Router::new()
        .route("/health", get(health))
        .route("/ready", get(readiness))
        .route("/v1/auth/register", post(modules::auth::register))
        .route("/v1/auth/login", post(modules::auth::login))
        .route("/v1/demo/start", post(modules::demo::start_demo))
        .route("/v1/demo/:session_id/reset", post(modules::demo::reset_demo))
        .route("/v1/demo/:session_id/actions", post(modules::demo::track_demo_action))
        .route("/v1/demo/:session_id/analytics", get(modules::demo::get_demo_analytics));

    let protected_routes = Router::new()
        .route("/v1/auth/logout", post(modules::auth::logout))
        .route("/v1/me", get(modules::auth::me))
        .route("/v1/candidates", get(modules::candidates::list).post(modules::candidates::create))
        .route("/v1/candidates/:id", get(modules::candidates::get_by_id).patch(modules::candidates::update))
        .route("/v1/candidates/:id/documents", post(modules::candidates::upload_document))
        .route("/v1/companies", get(modules::employers::list_companies).post(modules::employers::create_company))
        .route("/v1/companies/:id", patch(modules::employers::update_company))
        .route("/v1/employers/me", get(modules::employers::get_my_profile))
        .route("/v1/jobs", get(modules::jobs::list).post(modules::jobs::create))
        .route("/v1/jobs/:id", get(modules::jobs::get_by_id).patch(modules::jobs::update))
        .route("/v1/jobs/:id/apply", post(modules::applications::apply))
        .route("/v1/applications/:id", get(modules::applications::get_by_id))
        .route("/v1/applications/:id/stage", post(modules::applications::transition_stage))
        .route("/v1/applications/:id/decision", post(modules::applications::create_decision))
        .route("/v1/conversations", get(modules::chat::list_conversations).post(modules::chat::create_conversation))
        .route("/v1/conversations/:id/messages", get(modules::chat::get_messages).post(modules::chat::send_message))
        .route("/v1/conversations/:id/read", post(modules::chat::mark_read))
        .route("/v1/conversations/:id/attachments", post(modules::chat::upload_attachment))
        .route("/v1/meetings/request", post(modules::scheduling::create_meeting))
        .route("/v1/meetings/:id/accept", post(modules::scheduling::accept_meeting))
        .route("/v1/meetings/:id/deny", post(modules::scheduling::deny_meeting))
        .route("/v1/meetings/:id/reschedule", post(modules::scheduling::reschedule_meeting))
        .route("/v1/meetings/:id", get(modules::scheduling::get_meeting))
        .route("/v1/meetings", get(modules::scheduling::list_meetings))
        .route("/v1/interviews/rooms", post(modules::interviews::create_room))
        .route("/v1/interviews/rooms/:id/token", post(modules::interviews::get_room_token))
        .route("/v1/interviews/sessions/:id/events", post(modules::interviews::send_session_event))
        .route("/v1/interviews/sessions/:id/feedback", post(modules::interviews::submit_feedback))
        .route("/v1/meetings/:id/video-token", post(modules::interviews::issue_video_token))
        .route("/v1/meetings/:id/interview-room", get(modules::interviews::get_interview_room))
        .route("/v1/meetings/:id/end", post(modules::interviews::end_meeting))
        .route("/v1/billing/plans", get(modules::billing::get_plans))
        .route("/v1/billing/subscriptions", post(modules::billing::create_subscription))
        .route("/v1/billing/subscriptions/:id", patch(modules::billing::update_subscription))
        .route("/v1/billing/usage", get(modules::billing::get_usage))
        .route("/v1/shortcuts", get(modules::shortcuts::get_profile).patch(modules::shortcuts::update_bindings))
        .route("/v1/shortcuts/usage-events", post(modules::shortcuts::track_usage))
        .route("/v1/flags", get(modules::flags::get_all))
        .layer(axum_mw::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::require_auth,
        ));

    let webhook_routes = Router::new()
        .route("/v1/billing/webhooks/stripe", post(modules::billing::stripe_webhook))
        .route("/v1/video/webhook", post(modules::interviews::video_provider_webhook));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(webhook_routes)
        .layer(axum_mw::from_fn(inject_request_id))
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state)
}

async fn health() -> &'static str {
    "ok"
}

async fn readiness(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Result<&'static str, crate::error::AppError> {
    sqlx::query("SELECT 1").execute(&state.db).await?;
    Ok("ready")
}
