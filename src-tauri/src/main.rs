#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            doghttpclient_lib::greet,
            doghttpclient_lib::send_http_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
