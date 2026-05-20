#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

#[derive(Debug, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    #[serde(default)]
    pub form_data: Option<Vec<FormDataItem>>,
}

#[derive(Debug, Deserialize)]
pub struct FormDataItem {
    pub key: String,
    pub value: String,
    #[serde(default)]
    pub file_name: Option<String>,
    #[serde(default)]
    pub content_type: Option<String>,
    #[serde(default)]
    pub is_file: bool,
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
async fn send_http_request(request: HttpRequest) -> Result<HttpResponse, HttpError> {
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

    // Handle form-data multipart
    if let Some(form_data) = request.form_data {
        let mut multipart = reqwest::multipart::Form::new();
        
        for item in form_data {
            if item.is_file {
                // Decode base64 content
                let file_content = general_purpose::STANDARD.decode(&item.value)
                    .map_err(|e| HttpError {
                        message: format!("Failed to decode file content: {}", e),
                    })?;
                
                let file_name = item.file_name.unwrap_or_else(|| "file".to_string());
                let content_type = item.content_type.unwrap_or_else(|| "application/octet-stream".to_string());
                
                let part = reqwest::multipart::Part::bytes(file_content)
                    .file_name(file_name)
                    .mime_str(&content_type)
                    .map_err(|e| HttpError {
                        message: format!("Failed to create file part: {}", e),
                    })?;
                
                multipart = multipart.part(item.key, part);
            } else {
                multipart = multipart.text(item.key, item.value);
            }
        }
        
        req_builder = req_builder.multipart(multipart);
    } else if let Some(body) = request.body {
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
    
    // 将二进制数据转为 base64，避免字符串转换损坏
    let body = general_purpose::STANDARD.encode(&body_bytes);

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

mod storage;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            send_http_request,
            storage::cmd_load_data,
            storage::cmd_save_data,
            storage::cmd_create_backup,
            storage::cmd_list_backups,
            storage::cmd_restore_backup,
            storage::cmd_export_data,
            storage::cmd_import_data,
            storage::cmd_get_data_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
