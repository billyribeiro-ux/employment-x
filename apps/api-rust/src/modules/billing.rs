use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Extension;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthUser;
use crate::middleware::tenant::TenantContext;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct PlanResponse {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub tier: String,
    pub monthly_price_cents: i64,
    pub annual_price_cents: i64,
    pub currency: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct SubscriptionResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub plan_id: Uuid,
    pub status: String,
    pub billing_period: String,
    pub current_period_start: chrono::DateTime<chrono::Utc>,
    pub current_period_end: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub plan_id: Uuid,
    pub billing_period: String,
    pub payment_method_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSubscriptionRequest {
    pub plan_id: Option<Uuid>,
    pub billing_period: Option<String>,
    pub cancel_at_period_end: Option<bool>,
}

pub async fn get_plans(
    State(state): State<Arc<AppState>>,
    Extension(_auth): Extension<AuthUser>,
) -> AppResult<Json<serde_json::Value>> {
    let rows = sqlx::query_as::<_, (Uuid, String, String, String, i64, i64, String, bool)>(
        "SELECT id, name, slug, tier, monthly_price_cents, annual_price_cents, currency, is_active FROM plans WHERE is_active = true ORDER BY monthly_price_cents"
    )
    .fetch_all(&state.db).await?;

    let data: Vec<PlanResponse> = rows.into_iter().map(|r| PlanResponse {
        id: r.0, name: r.1, slug: r.2, tier: r.3,
        monthly_price_cents: r.4, annual_price_cents: r.5,
        currency: r.6, is_active: r.7,
    }).collect();

    Ok(Json(serde_json::json!({ "data": data })))
}

pub async fn create_subscription(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Json(body): Json<CreateSubscriptionRequest>,
) -> AppResult<(StatusCode, Json<SubscriptionResponse>)> {
    let tenant = TenantContext::from_auth(&auth)?;
    tenant.require_role(&["owner", "admin"])?;

    let plan_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plans WHERE id = $1 AND is_active = true")
        .bind(body.plan_id).fetch_one(&state.db).await?;
    if plan_exists == 0 {
        return Err(AppError::NotFound("Plan not found".to_string()));
    }

    let id = Uuid::now_v7();
    let now = chrono::Utc::now();
    let period_end = now + chrono::Duration::days(if body.billing_period == "annual" { 365 } else { 30 });

    sqlx::query(
        "INSERT INTO subscriptions (id, organization_id, plan_id, stripe_subscription_id, stripe_customer_id, status, billing_period, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, false, $7, $7)"
    )
    .bind(id).bind(tenant.organization_id).bind(body.plan_id)
    .bind(format!("sub_{}", Uuid::new_v4())).bind(format!("cus_{}", Uuid::new_v4()))
    .bind(&body.billing_period).bind(now).bind(period_end)
    .execute(&state.db).await?;

    sqlx::query(
        "INSERT INTO audit_events (id, organization_id, user_id, event_type, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, 'subscription.created', 'subscription', $4, $5, $6)"
    )
    .bind(Uuid::now_v7()).bind(tenant.organization_id).bind(auth.id).bind(id)
    .bind(serde_json::json!({"plan_id": body.plan_id, "billing_period": body.billing_period})).bind(now)
    .execute(&state.db).await?;

    Ok((StatusCode::CREATED, Json(SubscriptionResponse {
        id, organization_id: tenant.organization_id, plan_id: body.plan_id,
        status: "active".to_string(), billing_period: body.billing_period,
        current_period_start: now, current_period_end: period_end, created_at: now,
    })))
}

pub async fn update_subscription(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSubscriptionRequest>,
) -> AppResult<Json<SubscriptionResponse>> {
    let tenant = TenantContext::from_auth(&auth)?;
    tenant.require_role(&["owner", "admin"])?;

    let sub = sqlx::query_as::<_, (Uuid, Uuid, String, String, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        "SELECT organization_id, plan_id, status, billing_period, current_period_start, current_period_end, created_at FROM subscriptions WHERE id = $1"
    )
    .bind(id).fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound("Subscription not found".to_string()))?;

    tenant.can_write(sub.0)?;
    let now = chrono::Utc::now();

    let new_plan = body.plan_id.unwrap_or(sub.1);
    let new_period = body.billing_period.as_deref().unwrap_or(&sub.3);

    sqlx::query("UPDATE subscriptions SET plan_id = $2, billing_period = $3, cancel_at_period_end = COALESCE($4, cancel_at_period_end), updated_at = $5 WHERE id = $1")
        .bind(id).bind(new_plan).bind(new_period).bind(body.cancel_at_period_end).bind(now)
        .execute(&state.db).await?;

    Ok(Json(SubscriptionResponse {
        id, organization_id: sub.0, plan_id: new_plan,
        status: sub.2, billing_period: new_period.to_string(),
        current_period_start: sub.4, current_period_end: sub.5, created_at: sub.6,
    }))
}

pub async fn get_usage(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthUser>,
) -> AppResult<Json<serde_json::Value>> {
    let tenant = TenantContext::from_auth(&auth)?;

    let sub = sqlx::query_as::<_, (Uuid, Uuid, String, String)>(
        "SELECT id, plan_id, status, billing_period FROM subscriptions WHERE organization_id = $1 AND status IN ('active', 'trialing') LIMIT 1"
    )
    .bind(tenant.organization_id)
    .fetch_optional(&state.db).await?;

    let meters = sqlx::query_as::<_, (String, i64, Option<i64>)>(
        "SELECT meter_type, current_value, limit_value FROM usage_meters WHERE organization_id = $1"
    )
    .bind(tenant.organization_id)
    .fetch_all(&state.db).await?;

    let usage: Vec<serde_json::Value> = meters.into_iter().map(|m| serde_json::json!({
        "meter_type": m.0, "current_value": m.1, "limit_value": m.2,
    })).collect();

    Ok(Json(serde_json::json!({
        "subscription": sub.map(|s| serde_json::json!({"id": s.0, "plan_id": s.1, "status": s.2, "billing_period": s.3})),
        "usage_meters": usage,
    })))
}

pub async fn stripe_webhook(
    State(_state): State<Arc<AppState>>,
    body: axum::body::Bytes,
) -> AppResult<StatusCode> {
    let _raw = body;
    Ok(StatusCode::OK)
}
