use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

#[derive(Debug, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time_ms: u64,
    pub size_bytes: usize,
}

#[derive(Debug, Serialize)]
pub struct HttpError {
    pub message: String,
}

#[tauri::command]
pub async fn send_http_request(request: HttpRequest) -> Result<HttpResponse, HttpError> {
    let client = reqwest::Client::new();
    let start = Instant::now();
    
    let method = match request.method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        "HEAD" => reqwest::Method::HEAD,
        "OPTIONS" => reqwest::Method::OPTIONS,
        _ => reqwest::Method::GET,
    };
    
    let mut req_builder = client.request(method, &request.url);
    
    // Add headers
    for (key, value) in &request.headers {
        req_builder = req_builder.header(key, value);
    }
    
    // Add body
    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }
    
    let response = req_builder.send().await.map_err(|e| HttpError {
        message: format!("Request failed: {}", e),
    })?;
    
    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("Unknown").to_string();
    let status_code = status.as_u16();
    
    // Collect headers
    let mut headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(val) = value.to_str() {
            headers.insert(key.to_string(), val.to_string());
        }
    }
    
    // Get body
    let body_bytes = response.bytes().await.map_err(|e| HttpError {
        message: format!("Failed to read response body: {}", e),
    })?;
    let size_bytes = body_bytes.len();
    let body = String::from_utf8_lossy(&body_bytes).to_string();
    
    let time_ms = start.elapsed().as_millis() as u64;
    
    Ok(HttpResponse {
        status: status_code,
        status_text,
        headers,
        body,
        time_ms,
        size_bytes,
    })
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
