# 进度日志

## 会话：2025-05-21（首次规划化整理 + Collection 设置功能）

### 阶段 1：基础功能开发
- **状态：** complete
- **说明：** 在本次会话之前已完成，包括 HTTP 请求、Params/Headers/Body、Collections、Environments、Auth、History、cURL 生成/导入等全部基础功能

### 阶段 2：存储与持久化
- **状态：** complete
- **说明：** Tauri FS API + localStorage 双环境存储，自动保存 + 手动保存

### 阶段 3：Bug 修复与 UI 优化
- **状态：** in_progress
- **开始时间：** 2025-05-21
- 执行的操作：
  - 分析用户报告的 7 个 Bug
  - 修复存储不工作（setCurrentRequest 包含 auth/variables）
  - 修复 Environment 重复标题、Active 按钮缺失
  - 修复 Auth 类型下拉不响应
  - 修复 URL 地址栏固定布局
  - 修复 ParamsTab 输入创建多行（4 次尝试最终解决）
  - 浏览器验证修复效果
- 创建/修改的文件：
  - `src/store/index.ts` - setCurrentRequest 修复
  - `src/components/RequestPanel.tsx` - ParamsTab 重构
  - `src/components/EnvironmentPanel.tsx` - 布局简化
  - `src/components/EnvironmentVariablesEditor.tsx` - 直接用 currentEnvironmentId
  - `src/App.tsx` - 布局修复、URL 同步
  - `src/services/storage.ts` - 调试日志
- 新增 Collection 设置功能：
  - 在 Sidebar 的 Collection 项上添加设置图标（⚙️）
  - 创建 CollectionSettings 组件（Variables + Auth 配置）
  - 在 App.tsx 中添加 Collection 设置面板的全屏展示逻辑
  - 修复 TypeScript 类型错误（variables 可能为 undefined）
- 创建/修改的文件：
  - `src/store/index.ts` - setCurrentRequest 修复、添加 currentEditingCollectionId
  - `src/components/RequestPanel.tsx` - ParamsTab 重构
  - `src/components/EnvironmentPanel.tsx` - 布局简化
  - `src/components/EnvironmentVariablesEditor.tsx` - 直接用 currentEnvironmentId
  - `src/App.tsx` - 布局修复、URL 同步、CollectionSettings 集成
  - `src/services/storage.ts` - 调试日志
  - `src/components/CollectionSettings.tsx` - 新建 Collection 设置面板
  - `src/components/Sidebar.tsx` - 添加设置图标入口
- Git 提交：
  - `61eb5e6` - 统一保存逻辑
  - `63a72d2` - 修复 Authorization
  - `df83b84` - 修复 EnvironmentPanel
  - `198aaa5` - UI 修复
  - `959569e` ~ `874f97f` - ParamsTab 多次修复
  - `xxx` - 添加 Collection 设置功能

## 测试结果
| 测试 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|------|---------|---------|------|
| Params 输入 userId | KEY 列输入 "userId" | 只创建 1 行 | 创建 1 行 ✅ | ✅ 通过（浏览器） |
| Params 输入后 blur | 输入后按 Tab | URL 更新 | URL 未更新 | ⚠️ 待桌面验证 |
| 环境激活 | 点击环境项 | 右边显示变量 | 正常显示 ✅ | ✅ 通过 |
| Auth 类型切换 | 点击下拉选择 | 切换 Auth 类型 | 正常切换 ✅ | ✅ 通过 |

## 错误日志
| 时间戳 | 错误 | 尝试次数 | 解决方案 |
|--------|------|---------|---------|
| 2025-05-21 | Params 每字符创建一行 | 4 | ref + localParams 双轨 |
| 2025-05-21 | onParamsChange TS2322 | 1 | 移除废弃 props |
| 2025-05-21 | localParams 未使用 TS6133 | 1 | 用 localParams 作为 tableDataSource |

## 五问重启检查
| 问题 | 答案 |
|------|------|
| 我在哪里？ | 阶段 3（Bug 修复 + Collection 设置功能完成） |
| 我要去哪里？ | 阶段 4（待开发功能） |
| 目标是什么？ | 构建轻量级跨平台 API 测试工具 |
| 我学到了什么？ | 见 findings.md |
| 我做了什么？ | 修复 9 个 Bug，添加 Collection 设置功能，提交 10+ 次 |

---
*每个阶段完成后或遇到错误时更新此文件*
