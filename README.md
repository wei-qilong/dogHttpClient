# dogHttpClient

一个轻量级、跨平台的 API 测试工具，类似于 Postman，使用 Tauri + React + TypeScript 构建。

## 功能特性

### 已实现
- ✅ HTTP 请求发送（GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS）
- ✅ Query 参数编辑
- ✅ Headers 管理
- ✅ 请求 Body 编辑（raw JSON/XML/Text/HTML）
- ✅ 响应展示（Body/Headers/Cookies/Tests）
- ✅ 响应状态、时间、大小显示
- ✅ 请求历史记录
- ✅ 多环境管理（开发/测试/生产）
- ✅ 侧边栏可折叠
- ✅ 脚本编辑器占位（Pre-request / Tests）

### 待实现
- [ ] Collections 文件存储系统
- [ ] dog 脚本引擎执行
- [ ] Postman Collection 导入/导出
- [ ] 认证支持（Basic/Bearer/OAuth2）
- [ ] WebSocket 支持
- [ ] GraphQL 支持
- [ ] 批量运行 Collection

## 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS
- **桌面框架**: Tauri 2.0 (Rust)
- **状态管理**: Zustand
- **HTTP 客户端**: reqwest (Rust)
- **图标**: Lucide React

## 项目结构

```
dogHttpClient/
├── src/                      # 前端代码
│   ├── components/           # React 组件
│   │   ├── Sidebar.tsx       # 侧边栏（Collections/History/Environments）
│   │   ├── RequestPanel.tsx  # 请求面板
│   │   └── ResponsePanel.tsx # 响应面板
│   ├── store/                # Zustand 状态管理
│   ├── types/                # TypeScript 类型定义
│   ├── App.tsx               # 主应用组件
│   └── index.css             # 全局样式
├── src-tauri/                # Tauri/Rust 后端
│   └── src/
│       └── lib.rs            # HTTP 请求处理
└── package.json
```

## 开发环境要求

- Node.js 18+
- Rust 1.70+
- Linux: `libwebkit2gtk-4.0-dev` 等系统依赖

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式运行

```bash
npm run tauri dev
```

### 3. 构建生产版本

```bash
npm run tauri build
```

## dog 脚本 API

脚本中使用 `dog` 对象代替 `pm`：

```javascript
// Pre-request Script
dog.environment.set("token", "abc123");

// Tests
dog.test("Status code is 200", () => {
    dog.response.to.have.status(200);
});
```

## 界面截图

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [dogHttpClient]  [+]  [环境选择▼]                    [设置] [最小化] [×] │
├──────────┬──────────────────────────────────────────────────────────────┤
│          │  [GET ▼] [https://api.example.com/users        ] [发送] [保存] │
│ 侧边栏    │  ─────────────────────────────────────────────────────────── │
│          │  [Params] [Auth] [Headers] [Body] [Scripts]                  │
│ Collections│                                                                │
│ ─────────  │  ┌────────────────────────────────────────────────────────┐ │
│ 📁 用户管理 │  │  Query Params                                          │ │
│   ├─ 登录  │  │  ┌─────────┬─────────┬─────────┬─────────┐              │ │
│   └─ 列表  │  │  │ Key     │ Value   │ 描述    │   ✕     │              │ │
│           │  │  └─────────┴─────────┴─────────┴─────────┘              │ │
│ ─────────  │  └────────────────────────────────────────────────────────┘ │
│ 历史记录    │                                                                │
╞══════════╡  ═══════════════════════════════════════════════════════════ │
│ 环境变量    │  [Body] [Cookies] [Headers] [Test Results]                    │
│ ─────────  │  ┌────────────────────────────────────────────────────────┐ │
│ 🌍 开发环境 │  │  {                                                       │ │
│ 🌍 测试环境 │  │    "id": 1,                                              │ │
│ 🌍 生产环境 │  │    "name": "test"                                        │ │
│           │  │  }                                                       │ │
│           │  └────────────────────────────────────────────────────────┘ │
│           │  Status: 200 OK  |  Time: 245ms  |  Size: 1.2KB               │
└──────────┴──────────────────────────────────────────────────────────────┘
```

## License

MIT
