# dogHttpClient

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue" alt="Platform">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

> **English**: A lightweight, cross-platform API testing tool built with Tauri + React + TypeScript, similar to Postman.
> 
> **中文**: 一个轻量级、跨平台的 API 测试工具，使用 Tauri + React + TypeScript 构建，类似于 Postman。

---

## Features / 功能特性

### ✅ Implemented / 已实现

| Feature | 功能 | Description / 描述 |
|---------|------|-------------------|
| HTTP Methods | HTTP 方法 | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS |
| Query Params | Query 参数 | Editable table with URL sync / 可编辑表格，与 URL 双向同步 |
| Headers | 请求头 | Key-value editor / 键值对编辑器 |
| Body - Raw | Body - Raw | JSON / XML / Text / HTML |
| Body - Form-data | Body - Form-data | Key-value with Text/File type support / 支持文本和文件类型 |
| Body - Binary | Body - Binary | File upload / 文件上传 |
| URL-encoded | URL 编码 | Form URL encoding / 表单 URL 编码 |
| Response Body | 响应体 | Pretty JSON display / 格式化显示 |
| Response Headers | 响应头 | Table view / 表格展示 |
| Response Actions | 响应操作 | Copy to clipboard / Save to file / 复制到剪切板 / 保存文件 |
| CORS Bypass | 绕过 CORS | Via Tauri backend proxy / 通过 Tauri 后端代理 |
| Request History | 请求历史 | Last 100 requests / 最近 100 条记录 |
| Collections | 集合 | Save & organize requests / 保存和组织请求 |
| Environments | 环境变量 | Dev / Test / Production / 开发/测试/生产环境 |
| Code Generation | 代码生成 | Generate curl command / 生成 curl 命令 |
| Breadcrumb | 面包屑导航 | Collection > Request path / 显示当前路径 |
| Double-click Edit | 双击编辑 | Edit names by double-clicking / 双击编辑名称 |
| Sidebar Toggle | 侧边栏折叠 | Collapsible sidebar / 可折叠侧边栏 |

### 🔄 TODO / 待实现

- [ ] Collections file storage / Collections 文件存储系统
- [ ] Postman import/export / Postman 导入导出
- [ ] Authentication / 认证支持 (Basic / Bearer / OAuth2)
- [ ] WebSocket support / WebSocket 支持
- [ ] GraphQL support / GraphQL 支持
- [ ] Batch collection runner / 批量运行 Collection
- [ ] dog script engine / dog 脚本引擎

---

## Tech Stack / 技术栈

| Layer | 层级 | Technology / 技术 |
|-------|------|------------------|
| Frontend | 前端 | React 19 + TypeScript + Tailwind CSS |
| UI Library | UI 库 | Ant Design 5 |
| Desktop Framework | 桌面框架 | Tauri 1.x (Rust) |
| State Management | 状态管理 | Zustand |
| HTTP Client | HTTP 客户端 | reqwest (Rust backend) |
| Build Tool | 构建工具 | Vite |

---

## Project Structure / 项目结构

```
dogHttpClient/
├── src/                          # Frontend / 前端代码
│   ├── components/
│   │   ├── Sidebar.tsx          # Sidebar (Collections/History/Environments)
│   │   ├── RequestPanel.tsx      # Request panel (URL, params, headers, body)
│   │   └── ResponsePanel.tsx     # Response panel (body, headers, copy, save)
│   ├── store/
│   │   └── index.ts             # Zustand store / 状态管理
│   ├── types/
│   │   └── index.ts             # TypeScript types / 类型定义
│   ├── App.tsx                  # Main app component / 主组件
│   └── index.css                # Global styles / 全局样式
├── src-tauri/                   # Tauri/Rust backend / 后端
│   ├── src/
│   │   └── main.rs              # HTTP proxy handler / HTTP 代理处理
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
└── package.json
```

---

## Prerequisites / 环境要求

| Platform | 平台 | Requirements / 要求 |
|----------|------|-------------------|
| Windows | Windows | Windows 10+ |
| macOS | macOS | macOS 10.15+ |
| Development | 开发 | Node.js 18+, Rust 1.70+ |

---

## Quick Start / 快速开始

### 1. Install Dependencies / 安装依赖

```bash
npm install
```

### 2. Development Mode / 开发模式

```bash
npm run tauri dev
```

### 3. Build Production / 构建生产版本

```bash
npm run tauri build
```

---

## Screenshots / 界面截图

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [☰] [+] [Import]                              [⚙]     [─] [□] [×]   │
├──────────┬──────────────────────────────────────────────────────────────┤
│          │  [GET ▼] [https://httpbin.org/get?foo=bar  ] [▶ Send] [💾]  │
│ SIDEBAR  │  Scratch Pad / Untitled Request                             │
│          │  ─────────────────────────────────────────────────────────── │
│ [📁]     │  [Params] [Auth] [Headers] [Body] [Scripts] [</>]           │
│          │  ┌────────────────────────────────────────────────────────┐   │
│ Collections│ │  ☐ │ KEY      │ VALUE     │ TYPE  │                    │   │
│ ─────────  │ │  ☑ │ name     │ john      │ Text ▼│  选择文件         │   │
│ No items  │ │  ☑ │ avatar   │ 📄 img.jpg│ File ▼│                    │   │
│          │ └────────────────────────────────────────────────────────┘   │
│ [🕐]     │                                                                │
│ History  │ ═══════════════════════════════════════════════════════════ │
│ ─────────  │  [Body] [Headers]                                            │
│ No items  │  ┌────────────────────────────────────────────────────────┐ │
│          │  │  {                                                       │ │
│ [🌐]     │  │    "args": { "foo": "bar" },                            │ │
│ Env      │  │    "headers": { ... }                                   │ │
│ ─────────  │  │  }                                                       │ │
│ 🌍 None   │  └────────────────────────────────────────────────────────┘ │
│          │  200 OK  │  ⏱ 245ms  │  📊 1.2KB    │ [📋 Copy] [💾 Save]   │
└──────────┴──────────────────────────────────────────────────────────────┘
```

---

## Usage Tips / 使用提示

### URL & Params Sync / URL 与参数同步

- **Add params in URL**: `https://api.com?foo=bar` → Auto-fills to Params table
  在 URL 中添加参数会自动填充到参数表格
- **Edit in table**: Changes sync back to URL
  在表格中编辑会自动同步到 URL

### Body Types / Body 类型

| Type | 说明 |
|------|------|
| none | No body / 无 body |
| form-data | Key-value pairs, supports Text & File types / 键值对，支持文本和文件 |
| x-www-form-urlencoded | URL encoded form / URL 编码表单 |
| raw | JSON / XML / Text / HTML |
| binary | Upload binary file / 上传二进制文件 |

### Copy & Save / 复制和保存

- **Copy**: Copies response body to clipboard
  复制响应体到剪切板
- **Save**: Downloads response with auto-detected file extension based on Content-Type
  根据 Content-Type 自动判断文件格式并下载

---

## License / 许可证

MIT License / MIT 许可证
