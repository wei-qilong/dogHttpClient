use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::AppHandle;

// 简单的文件日志
static mut LOG_FILE: Option<std::fs::File> = None;

fn init_log_file(app_handle: &AppHandle) {
    unsafe {
        if LOG_FILE.is_none() {
            if let Some(data_dir) = app_handle.path_resolver().app_data_dir() {
                let log_path = data_dir.join("dogHttpClient").join("app.log");
                if let Ok(file) = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&log_path) {
                    LOG_FILE = Some(file);
                    log_to_file(&format!("[Storage] Log file initialized at: {:?}", log_path));
                }
            }
        }
    }
}

fn log_to_file(msg: &str) {
    unsafe {
        if let Some(ref mut file) = LOG_FILE {
            let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
            let _ = writeln!(file, "[{}] {}", timestamp, msg);
            let _ = file.flush();
        }
    }
    // 同时输出到控制台
    println!("{}", msg);
}

/// 应用数据存储结构
#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct AppData {
    /// 版本号，用于数据迁移
    pub version: String,
    /// Collections 数据
    pub collections: Vec<Collection>,
    /// 当前请求
    pub current_request: Option<RequestConfig>,
    /// 请求历史
    pub history: Vec<HistoryItem>,
    /// 环境列表
    pub environments: Vec<Environment>,
    /// 当前环境ID
    pub current_environment_id: Option<String>,
    /// 用户设置
    pub settings: Settings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Collection {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub requests: Vec<RequestConfig>,
    pub folders: Vec<Folder>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub requests: Vec<RequestConfig>,
    #[serde(default)]
    pub folders: Vec<Folder>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RequestConfig {
    pub id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValuePair>,
    pub params: Vec<KeyValuePair>,
    #[serde(rename = "bodyType")]
    pub body_type: String,
    #[serde(rename = "bodyContent")]
    pub body_content: String,
    #[serde(rename = "bodyRawType")]
    pub body_raw_type: String,
    #[serde(rename = "formData", default)]
    pub form_data: Vec<FormDataItem>,
    #[serde(rename = "urlEncoded", default)]
    pub url_encoded: Vec<KeyValuePair>,
    #[serde(rename = "binaryFile")]
    pub binary_file: Option<BinaryFile>,
    #[serde(rename = "preRequestScript", default)]
    pub pre_request_script: String,
    #[serde(rename = "testsScript", default)]
    pub tests_script: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BinaryFile {
    pub name: String,
    #[serde(rename = "type")]
    pub content_type: String,
    pub data: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeyValuePair {
    pub id: String,
    pub key: String,
    pub value: String,
    #[serde(default)]
    pub description: Option<String>,
    pub enabled: bool,
    #[serde(rename = "type")]
    pub item_type: Option<String>,
    #[serde(rename = "fileName")]
    pub file_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FormDataItem {
    pub id: String,
    pub key: String,
    pub value: String,
    #[serde(rename = "fileName", default)]
    pub file_name: Option<String>,
    #[serde(rename = "contentType", default)]
    pub content_type: Option<String>,
    #[serde(rename = "type", default)]
    pub item_type: String,
    #[serde(default)]
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: String,
    pub timestamp: i64,
    pub request: RequestConfig,
    pub response: Option<ResponseData>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Environment {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub variables: Vec<KeyValuePair>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResponseData {
    pub status: u16,
    #[serde(rename = "statusText")]
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time: u64,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct Settings {
    pub theme: String,
    pub language: String,
    pub timeout: u32,
    #[serde(rename = "maxHistory")]
    pub max_history: u32,
    #[serde(rename = "autoSave")]
    pub auto_save: bool,
}

/// 存储管理器
pub struct StorageManager {
    data_dir: PathBuf,
}

impl StorageManager {
    /// 创建存储管理器
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        // 初始化日志文件
        init_log_file(app_handle);
        
        // 使用 path_resolver 获取应用数据目录
        let base_dir = app_handle
            .path_resolver()
            .app_data_dir()
            .ok_or_else(|| "Failed to get app data directory".to_string())?;
        
        let data_dir = base_dir.join("dogHttpClient");
        
        log_to_file(&format!("[Storage] Base app data dir: {:?}", base_dir));
        log_to_file(&format!("[Storage] Full data dir: {:?}", data_dir));
        
        // 确保目录存在
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
        
        log_to_file("[Storage] Data directory ready");
        
        Ok(Self { data_dir })
    }

    /// 获取数据文件路径
    fn get_data_file_path(&self) -> PathBuf {
        self.data_dir.join("data.json")
    }

    /// 获取备份目录路径
    fn get_backup_dir(&self) -> PathBuf {
        self.data_dir.join("backups")
    }

    /// 加载数据
    pub fn load_data(&self) -> Result<AppData, String> {
        let file_path = self.get_data_file_path();

        log_to_file(&format!("[Storage] Loading data from: {:?}", file_path));

        if !file_path.exists() {
            log_to_file("[Storage] Data file does not exist, returning default");
            // 返回默认数据
            return Ok(AppData {
                version: "1.0.0".to_string(),
                collections: vec![Collection {
                    id: "__default__".to_string(),
                    name: "default".to_string(),
                    description: None,
                    requests: vec![],
                    folders: vec![],
                }],
                current_request: None,
                history: vec![],
                environments: vec![
                    Environment { id: "dev".to_string(), name: "Development".to_string(), variables: vec![] },
                    Environment { id: "test".to_string(), name: "Testing".to_string(), variables: vec![] },
                    Environment { id: "prod".to_string(), name: "Production".to_string(), variables: vec![] },
                ],
                current_environment_id: Some("dev".to_string()),
                settings: Settings::default(),
            });
        }

        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read data file: {}", e))?;

        log_to_file(&format!("[Storage] Loaded content length: {} bytes", content.len()));

        let mut data: AppData = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse data file: {}", e))?;

        // 如果 environments 为空，添加默认环境
        if data.environments.is_empty() {
            data.environments = vec![
                Environment { id: "dev".to_string(), name: "Development".to_string(), variables: vec![] },
                Environment { id: "test".to_string(), name: "Testing".to_string(), variables: vec![] },
                Environment { id: "prod".to_string(), name: "Production".to_string(), variables: vec![] },
            ];
            data.current_environment_id = Some("dev".to_string());
        }

        log_to_file(&format!("[Storage] Successfully loaded {} collections, {} history items, {} environments",
                 data.collections.len(), data.history.len(), data.environments.len()));

        Ok(data)
    }

    /// 保存数据
    pub fn save_data(&self, data: &AppData) -> Result<(), String> {
        let file_path = self.get_data_file_path();

        log_to_file(&format!("[Storage] Saving data to: {:?}", file_path));
        log_to_file(&format!("[Storage] Saving {} collections, {} history items, {} environments",
                 data.collections.len(), data.history.len(), data.environments.len()));
        
        // 先写入临时文件，防止写入过程中出错导致数据损坏
        let temp_path = file_path.with_extension("tmp");
        
        let json = serde_json::to_string_pretty(data)
            .map_err(|e| format!("Failed to serialize data: {}", e))?;
        
        log_to_file(&format!("[Storage] JSON size: {} bytes", json.len()));
        
        fs::write(&temp_path, json)
            .map_err(|e| format!("Failed to write temp file: {}", e))?;
        
        // 原子性替换
        fs::rename(&temp_path, &file_path)
            .map_err(|e| format!("Failed to rename temp file: {}", e))?;
        
        log_to_file("[Storage] Save completed successfully");
        
        Ok(())
    }

    /// 创建备份
    pub fn create_backup(&self) -> Result<String, String> {
        let backup_dir = self.get_backup_dir();
        fs::create_dir_all(&backup_dir)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;
        
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let backup_name = format!("data_backup_{}.json", timestamp);
        let backup_path = backup_dir.join(&backup_name);
        
        let data = self.load_data()?;
        let json = serde_json::to_string_pretty(&data)
            .map_err(|e| format!("Failed to serialize data: {}", e))?;
        
        fs::write(&backup_path, json)
            .map_err(|e| format!("Failed to write backup file: {}", e))?;
        
        Ok(backup_name)
    }

    /// 列出备份文件
    pub fn list_backups(&self) -> Result<Vec<String>, String> {
        let backup_dir = self.get_backup_dir();
        
        if !backup_dir.exists() {
            return Ok(vec![]);
        }
        
        let mut backups = vec![];
        for entry in fs::read_dir(&backup_dir)
            .map_err(|e| format!("Failed to read backup directory: {}", e))? {
            if let Ok(entry) = entry {
                if let Some(name) = entry.file_name().to_str() {
                    if name.starts_with("data_backup_") && name.ends_with(".json") {
                        backups.push(name.to_string());
                    }
                }
            }
        }
        
        backups.sort_by(|a, b| b.cmp(a)); // 最新的在前
        Ok(backups)
    }

    /// 从备份恢复
    pub fn restore_from_backup(&self, backup_name: &str) -> Result<(), String> {
        let backup_path = self.get_backup_dir().join(backup_name);
        let file_path = self.get_data_file_path();
        
        if !backup_path.exists() {
            return Err(format!("Backup file not found: {}", backup_name));
        }
        
        fs::copy(&backup_path, &file_path)
            .map_err(|e| format!("Failed to restore backup: {}", e))?;
        
        Ok(())
    }

    /// 导出数据到指定路径
    pub fn export_data(&self, export_path: &str) -> Result<(), String> {
        let data = self.load_data()?;
        let json = serde_json::to_string_pretty(&data)
            .map_err(|e| format!("Failed to serialize data: {}", e))?;
        
        fs::write(export_path, json)
            .map_err(|e| format!("Failed to write export file: {}", e))?;
        
        Ok(())
    }

    /// 从指定路径导入数据
    pub fn import_data(&self, import_path: &str) -> Result<AppData, String> {
        let content = fs::read_to_string(import_path)
            .map_err(|e| format!("Failed to read import file: {}", e))?;
        
        let data: AppData = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse import file: {}", e))?;
        
        // 保存导入的数据
        self.save_data(&data)?;
        
        Ok(data)
    }

    /// 获取数据目录路径（用于显示给用户）
    pub fn get_data_directory(&self) -> String {
        self.data_dir.to_string_lossy().to_string()
    }
}

/// Tauri 命令：加载数据
#[tauri::command]
pub fn cmd_load_data(app_handle: AppHandle) -> Result<AppData, String> {
    log_to_file("[Storage] cmd_load_data called");
    let storage = StorageManager::new(&app_handle)?;
    storage.load_data()
}

/// Tauri 命令：保存数据
#[tauri::command]
pub fn cmd_save_data(app_handle: AppHandle, data: AppData) -> Result<(), String> {
    log_to_file(&format!("[Storage] cmd_save_data called with {} collections", data.collections.len()));
    let storage = StorageManager::new(&app_handle)?;
    storage.save_data(&data)
}

/// Tauri 命令：创建备份
#[tauri::command]
pub fn cmd_create_backup(app_handle: AppHandle) -> Result<String, String> {
    let storage = StorageManager::new(&app_handle)?;
    storage.create_backup()
}

/// Tauri 命令：列出备份
#[tauri::command]
pub fn cmd_list_backups(app_handle: AppHandle) -> Result<Vec<String>, String> {
    let storage = StorageManager::new(&app_handle)?;
    storage.list_backups()
}

/// Tauri 命令：恢复备份
#[tauri::command]
pub fn cmd_restore_backup(app_handle: AppHandle, backup_name: String) -> Result<(), String> {
    let storage = StorageManager::new(&app_handle)?;
    storage.restore_from_backup(&backup_name)
}

/// Tauri 命令：导出数据
#[tauri::command]
pub fn cmd_export_data(app_handle: AppHandle, path: String) -> Result<(), String> {
    let storage = StorageManager::new(&app_handle)?;
    storage.export_data(&path)
}

/// Tauri 命令：导入数据
#[tauri::command]
pub fn cmd_import_data(app_handle: AppHandle, path: String) -> Result<AppData, String> {
    let storage = StorageManager::new(&app_handle)?;
    storage.import_data(&path)
}

/// Tauri 命令：获取数据目录
#[tauri::command]
pub fn cmd_get_data_directory(app_handle: AppHandle) -> Result<String, String> {
    let storage = StorageManager::new(&app_handle)?;
    Ok(storage.get_data_directory())
}
