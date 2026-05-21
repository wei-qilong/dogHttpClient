# 发现与决策

## 需求
- 类似 Postman 的轻量级 API 测试桌面工具
- 跨平台（Windows/macOS/Linux）
- 支持 Collections、Environments、History
- 支持多种 Auth 类型、Body 类型
- 变量替换 {{var}} 支持多级优先级（request > collection > environment）

## 研究发现

### 项目架构
- 前端：React 19 + TypeScript + Ant Design 5 + Zustand + Tailwind CSS + Vite
- 后端：Tauri 1.x (Rust)，通过 `invoke` 调用 Rust 命令
- 状态管理：Zustand store（`src/store/index.ts`）
- 存储：本地 JSON 文件（Tauri FS API），浏览器环境降级为 localStorage

### 核心数据流
```
用户输入 → localParams/ref（临时） → blur/Enter → setCurrentRequest → collections 更新 → 自动保存（1s防抖）→ data.json
```

### URL/Params 双向同步机制
- URL → Params：handleUrlChange 解析 query string，防循环用 paramsGeneratedUrl 比较
- Params → URL：useEffect 监听 currentRequest.params，拼接启用的 params
- 两处都传 skipDirty=true 避免循环

### ParamsTab 三层架构
1. `localParams` (useState) - 驱动 UI 渲染
2. `editingParamsRef` (useRef) - 跟踪临时编辑，避免 React 批处理
3. `syncToStore` - blur/Enter 时同步到 store

### 保存机制
- setCurrentRequest：任何修改都同步到 collections，触发自动保存
- saveAllDirty：只同步当前请求（`req.id === state.currentRequest.id`）
- 自动保存订阅：collections/history/environments 变化 → debouncedSave(1s)
- Ctrl+S：调用 saveAllDirty()

## 技术决策
| 决策 | 理由 |
|------|------|
| ref + localParams 双轨 | 避免 React 批处理导致每字符创建新行 |
| emptyRowId 用 useMemo | 稳定 ID 避免输入框失焦 |
| Tabs destroyOnHidden | 节省内存，切换回来通过 useEffect 恢复 |
| 环境编辑器全屏展示 | 侧边栏 220px 太窄 |
| storage.ts 双环境支持 | 开发时用浏览器调试，生产用 Tauri |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| Params 每字符创建一行 | ref + localParams 双轨，onChange 只更新不添加 |
| URL/Params 循环更新 | paramsGeneratedUrl 比较 + skipDirty |
| onParamsChange 废弃 props 导致编译错误 | 移除 props 接口 |
| displayParams 定义未使用 | 死代码，待清理 |
| VALUE 列输入不实时更新 | 只更新 ref 不更新 localParams，待修复 |
| debouncedSave Promise 泄漏 | 防抖取消时上一次 Promise 不会 settle |
| saveAllDirty 只同步当前请求 | 快速切换编辑多个请求时其他可能丢失 |

## 资源
- 项目文档：`README.md`、`STORAGE_DESIGN.md`、`TEST_CASES.md`
- AI 记忆：`AI_MEMORY.md`（上下文压缩后恢复用）
- Git 历史：`git log --oneline` 查看提交记录

## 视觉/浏览器发现
<!-- 关键：每执行2次查看/浏览器操作后必须更新此部分 -->
- ParamsTab 修复后浏览器测试：输入 "userId" 只创建 1 行 ✅
- URL 在 blur 后未更新（浏览器环境，需桌面应用验证）
- 环境面板布局正常，点击即激活 ✅

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
