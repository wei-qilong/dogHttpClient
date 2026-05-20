# dogHttpClient 存储方案设计

## 方案概述

采用 **本地 JSON 文件 + Tauri FS API** 方案，数据存储在用户系统的应用数据目录中。

## 存储位置

### 各平台路径

| 平台 | 存储路径 |
|------|----------|
| Windows | `%APPDATA%/dogHttpClient/` |
| macOS | `~/Library/Application Support/dogHttpClient/` |
| Linux | `~/.config/dogHttpClient/` |

### 文件结构

```
dogHttpClient/
├── data.json          # 主数据文件
└── backups/           # 备份目录
    ├── data_backup_20240115_143022.json
    ├── data_backup_20240114_091530.json
    └── ...
```

## 数据格式

### data.json 结构

```json
{
  "version": "1.0.0",
  "collections": [
    {
      "id": "uuid",
      "name": "My Collection",
      "requests": [...],
      "folders": [...]
    }
  ],
  "current_request": {...},
  "history": [...],
  "settings": {
    "theme": "light",
    "language": "zh-CN",
    "timeout": 30000,
    "max_history": 100,
    "auto_save": true
  }
}
```

## 功能特性

### 1. 自动保存
- 数据变更后 1 秒自动保存
- 使用防抖避免频繁写入

### 2. 原子写入
- 先写入临时文件 `.tmp`
- 成功后重命名为正式文件
- 防止写入过程中数据损坏

### 3. 备份机制
- 手动创建备份
- 备份文件按时间戳命名
- 可从备份恢复

### 4. 导入/导出
- 支持导出为 JSON 文件
- 支持从 JSON 文件导入
- 便于数据迁移和分享

## 后端 API

### Rust 命令

```rust
// 加载数据
cmd_load_data() -> AppData

// 保存数据
cmd_save_data(data: AppData)

// 创建备份
cmd_create_backup() -> String

// 列出备份
cmd_list_backups() -> Vec<String>

// 恢复备份
cmd_restore_backup(backup_name: String)

// 导出数据
cmd_export_data(path: String)

// 导入数据
cmd_import_data(path: String) -> AppData

// 获取数据目录
cmd_get_data_directory() -> String
```

### 前端服务

```typescript
// services/storage.ts
loadData(): Promise<AppData>
saveData(data: AppData): Promise<void>
createBackup(): Promise<string>
listBackups(): Promise<string[]>
restoreBackup(name: string): Promise<void>
exportData(path: string): Promise<void>
importData(path: string): Promise<AppData>
getDataDirectory(): Promise<string>
debouncedSave(data: AppData, delay?: number): Promise<void>
```

## 与其他方案对比

| 方案 | 优点 | 缺点 | 选择理由 |
|------|------|------|----------|
| **本地 JSON** ✅ | 简单、可移植、用户可控 | 无版本控制 | 符合需求，易于备份 |
| IndexedDB | 浏览器原生、大容量 | 浏览器限制 | 不适合 Tauri 桌面应用 |
| SQLite | 结构化、性能好 | 需要额外依赖 | 过于复杂，JSON 足够 |
| Tauri Store | 官方支持 | 容量限制 | 功能有限 |
| 用户指定目录 | 灵活 | 需要用户选择 | 可作为导出功能 |

## 未来扩展

1. **云端同步** - 可选的云端备份
2. **Git 集成** - 版本控制 Collections
3. **加密存储** - 敏感数据加密
4. **多工作区** - 切换不同项目数据
