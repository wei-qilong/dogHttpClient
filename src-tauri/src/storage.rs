use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::api::path::app_data_dir;
use tauri::AppHandle;

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
    /// 用户设置
    pub settings: Settings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub requests: Vec<RequestConfig>,
    pub folders: Vec<Folder>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub requests: Vec<RequestConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RequestConfig {
    pub id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValuePair>,
    pub params: Vec<KeyValuePair>,
    pub body_type: String,
    pub body_content: String,
    pub body_raw_type: String,
    pub form_data: Vec<FormDataItem>,
    pub url_encoded: Vec<KeyValuePair>,
    pub pre_request_script: String,
    pub tests_script: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeyValuePair {
    pub id: String,
    pub key: String,
    pub value: String,
    pub description: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FormDataItem {
    pub id: String,
    pub key: String,
    pub value: String,
    #[serde(rename = "fileName")]
    pub file_name: Option<String>,
    #[serde(rename = "contentType")]
    pub content_type: Option<String>,
    #[serde(rename = "type")]
    pub item_type: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: String,
    pub timestamp: i64,
    pub request: RequestConfig,
    pub response_status: u16,
}

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct Settings {
    pub theme: String,
    pub language: String,
    pub timeout: u32,
    pub max_history: u32,
    pub auto_save: bool,
}

/// 存储管理器
pub struct StorageManager {
    data_dir: PathBuf,
}

impl StorageManager {
    /// 创建存储管理器
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let data_dir = app_data_dir(&app_handle.config())
            .ok_or_else(|| "Failed to get app data directory".to_string())?
            .join("dogHttpClient");
        
        // 确保目录存在
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
        
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
        
        if !file_path.exists() {
            // 返回默认数据
            return Ok(AppData {
                version: "1.0.0".to_string(),
                collections: vec![Collection {
                    id: "scratch-pad".to_string(),
                    name: "default".to_string(),
                    requests: vec![],
                    folders: vec![],
                }],
                current_request: None,
                history: vec![],
                settings: Settings::default(),
            });
        }

        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read data file: {}", e))?;
        
        let data: AppData = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse data file: {}", e))?;
        
        Ok(data)
    }

    /// 保存数据
    pub fn save_data(&self, data: &AppData) -> Result<(), String> {
        let file_path = self.get_data_file_path();
        
        // 先写入临时文件，防止写入过程中出错导致数据损坏
        let temp_path = file_path.with_extension("tmp");
        
        let json = serde_json::to_string_pretty(data)
            .map_err(|e| format!("Failed to serialize data: {}", e))?;
        
        fs::write(&temp_path, json)
            .map_err(|e| format!("Failed to write temp file: {}", e))?;
        
        // 原子性替换
        fs::rename(&temp_path, &file_path)
            .map_err(|e| format!("Failed to rename temp file: {}", e))?;
        
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
    let storage = StorageManager::new(&app_handle)?;
    storage.load_data()
}

/// Tauri 命令：保存数据
#[tauri::command]
pub fn cmd_save_data(app_handle: AppHandle, data: AppData) -> Result<(), String> {
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