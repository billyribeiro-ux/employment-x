use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct RequestId(pub String);

pub async fn inject_request_id<B>(mut request: Request<B>, next: Next<B>) -> Response {
    let request_id = request
        .headers()
        .get("X-Request-Id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    request.extensions_mut().insert(RequestId(request_id.clone()));

    let mut response = next.run(request).await;
    response
        .headers_mut()
        .insert("X-Request-Id", request_id.parse().unwrap());
    response
}
