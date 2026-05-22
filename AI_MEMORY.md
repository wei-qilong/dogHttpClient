# dogHttpClient - AI 开发记忆

> 此文件用于 AI 助手在上下文压缩后恢复记忆。每次重要修改后请更新此文件。

---

## 项目概况

- **类型**: Tauri 桌面应用（Rust 后端 + React 前端）
- **技术栈**: React 19 + TypeScript + Ant Design 5 + Zustand + Tailwind CSS + Vite
- **状态管理**: Zustand（`src/store/index.ts`）
- **存储**: 本地 JSON 文件 + Tauri FS API（`src/services/storage.ts`）
- **浏览器兼容**: storage.ts 同时支持 Tauri 环境和浏览器 localStorage（用于开发调试）

---

## 关键文件索引

| 文件 | 职责 |
|------|------|
| `src/App.tsx` | 主布局、URL/Params 双向同步、handleSave |
| `src/store/index.ts` | Zustand store、setCurrentRequest、saveAllDirty、sendRequest、自动保存 |
| `src/components/RequestPanel.tsx` | ParamsTab、HeadersTab、BodyTab、AuthTab 等 |
| `src/components/ResponsePanel.tsx` | 响应展示（Pretty/Raw/Preview） |
| `src/components/Sidebar.tsx` | 侧边栏（Collections/History/Environments 导航） |
| `src/components/EnvironmentPanel.tsx` | 环境列表管理（侧边栏内，220px 宽） |
| `src/components/EnvironmentVariablesEditor.tsx` | 环境变量编辑器（主内容区全屏展示） |
| `src/services/storage.ts` | 数据持久化（Tauri invoke / localStorage） |
| `src/types/index.ts` | TypeScript 类型定义 |

---

## 核心架构要点

### 1. URL/Params 双向同步（App.tsx）

**URL -> Params（handleUrlChange）:**
- 用户输入 URL 时解析 query string 为 params 数组
- 防循环机制：计算 `paramsGeneratedUrl`，如果输入 URL 与之一致则跳过解析
- 解析时复用已有 param 的 ID（按 key 匹配）

**Params -> URL（useEffect）:**
- 监听 `currentRequest.params` 变化，拼接启用的 params 到 URL
- 使用 `prevParamsRef` 做引用比较避免不必要更新
- 两处都传 `skipDirty = true` 避免循环标记脏

### 2. ParamsTab 输入机制（RequestPanel.tsx）

**三层架构（重要！之前踩过坑）:**
- `localParams` (useState): 驱动 UI 渲染
- `editingParamsRef` (useRef): 跟踪临时编辑状态，避免 React 批处理问题
- `syncToStore`: 只在 blur/Enter 时同步到 store

**KEY 列 onChange**: 同时更新 ref 和 localParams（保证输入框实时显示）
**VALUE/DESCRIPTION 列 onChange**: 只更新 ref（不触发重渲染），blur 时同步
**空行机制**: `emptyRowId` 用 `useMemo` 生成，保证稳定不导致输入框失焦

**⚠️ 踩坑记录**: 曾多次尝试修复 Params 输入创建多行问题：
- 直接在 onChange 中添加新行 → 每个字符创建一行（错误）
- 用 index 判断空行 → index 总是指向最后一行（错误）
- 用 record.id 判断空行 → 仍然每字符创建一行（错误）
- **最终方案**: 使用 ref + localParams 双轨，onChange 只更新不添加新行

### 3. 保存机制（store/index.ts）

**setCurrentRequest**: 任何修改都同步到 collections 数组，触发自动保存
**saveAllDirty**: 遍历所有 collection，将脏请求替换为 currentRequest，然后 `debouncedSave(data, 0)` 立即持久化
**自动保存订阅**: collections/history/environments 变化 → `debouncedSave(data, 1000)`（1秒防抖）
**Ctrl+S**: 调用 `saveAllDirty()`

**⚠️ 注意**: `saveAllDirty` 只同步当前请求（`req.id === state.currentRequest.id`），快速切换编辑多个请求时其他脏请求可能丢失

### 4. 存储层（storage.ts）

- Tauri 环境: `invoke('cmd_load_data')` / `invoke('cmd_save_data')`
- 浏览器环境: `localStorage.getItem('dogHttpClient_data')`
- `debouncedSave`: 模块级 `saveTimeout` 实现防抖，delay=0 时立即保存
- **⚠️ Promise 泄漏**: 防抖取消上一次保存时，上一次 Promise 永远不会 settle

---

## 已完成的修复记录

### 2025-05-21 批量修复

1. **存储不工作**: `setCurrentRequest` 现在包含 `auth` 和 `variables` 字段，任何修改同步到 collections
2. **Environment 重复标题**: 简化 EnvironmentPanel 为单列布局，移除内部标题
3. **Active 按钮缺失**: 点击环境项直接激活（`setCurrentEnvironmentId`），无需单独按钮
4. **切换环境后右边无变化**: `EnvironmentVariablesEditor` 直接使用 `currentEnvironmentId`
5. **Auth 类型下拉不响应**: `setCurrentRequest` 包含 `auth` 字段
6. **History 不显示**: 添加调试日志，`sendRequest` 完成后 `addToHistory`
7. **Params 输入创建多行**: 使用 ref + localParams 双轨架构（见上方详细说明）
8. **URL 地址栏固定**: 布局改为 flex column，RequestPanel 和 ResponsePanel 各 `flex: 1` 可滚动
9. **移除无用 UI**: 删除 Environments 标题旁的 +号、多余的 Active 按钮

---

## 已知问题 & 待办

### 待修复
- [ ] VALUE 列输入时 UI 不实时更新（只更新 ref 不更新 localParams）
- [ ] `displayParams` 变量已定义但未使用（死代码）
- [ ] Settings 按钮无实际功能
- [ ] 面包屑编辑 Collection 名称不触发 `markDirty`
- [ ] 环境删除无二次确认
- [ ] 环境变量 value 明文显示，敏感信息无遮罩

### 待开发
- [ ] Collections 文件存储系统
- [ ] Postman 导入/导出
- [ ] WebSocket 支持
- [ ] GraphQL 支持
- [ ] 批量运行 Collection
- [ ] dog 脚本引擎

---

## 开发注意事项

1. **这是桌面应用，不是浏览器应用**: 最终在 Tauri 中运行，浏览器测试仅供参考
2. **修改 store 时注意自动保存**: 任何 `setCurrentRequest` 都会触发 collections 更新和自动保存
3. **Params/URL 同步要传 skipDirty**: 避免循环标记脏导致无限保存
4. **Table 的 render 函数中避免闭包陷阱**: antd Table 的 render 函数中 `index` 参数是当前行的索引，不是固定值
5. **空行 ID 必须用 useMemo 稳定**: 否则每次渲染生成新 ID 会导致输入框失焦
6. **Tabs 设置了 destroyOnHidden**: 切换 tab 时组件销毁重建，本地 state 会丢失（但 useEffect 会从 store 恢复）
7. **git 提交前先检查历史**: 用户强调修改前先看 git 记录，了解之前为什么这么做

---

## 排查方法论（重要！从存储功能修复中总结的教训）

> 以下方法从"修复存储功能花了 15+ 次提交"的惨痛教训中提炼，**必须严格遵守**。

### 原则一：先建立可观测性，再修 Bug

**错误做法**: 加 console.log → 发现看不到 → 让用户按 F12 → 用户说 exe 没有 F12 → 继续纠结
**正确做法**: 在桌面应用中，第一时间把日志写到文件里（Rust 的 log_to_file），确保能直接看到

**具体规则**:
- Tauri 桌面应用的 release 构建没有 DevTools，`console.log` 对开发者不可见
- 前端日志必须通过 `invoke('log_from_frontend', { message })` 写入 Rust 的日志文件
- **任何调试的第一步都是确认"日志能看到"**，然后再分析日志内容

### 原则二：从已有证据反推，不要盲目猜测

**错误做法**: 用户给日志说"没有保存日志"，我继续加前端日志（因为看不到）
**正确做法**: Rust 日志只有 Loading 没有 Saving → 说明前端没调用到 Rust → 问题在前端到 Rust 的链路上

**具体规则**:
- 收到用户反馈后，先分析已有信息能得出什么结论
- 如果 Rust 端没有收到调用，问题一定在前端（环境检测、序列化、调用方式）
- 如果 Rust 端收到了但报错，问题在序列化/反序列化/字段匹配

### 原则三：一次性系统性排查整条链路

**Tauri 前后端集成的完整链路**:
```
前端状态 → JSON 序列化 → Tauri invoke → Rust 接收 → serde 反序列化 → 业务逻辑 → 文件写入
```

**排查清单**:
1. 前端是否正确触发了保存？（日志能看到吗？）
2. 前端到 Rust 的调用是否成功？（isTauri 环境检测是否正确？）
3. JSON 序列化后的字段名是否匹配？（camelCase vs snake_case）
4. Rust 反序列化是否成功？（serde 的 rename/alias 是否配置？）
5. Rust 业务逻辑是否正确执行？
6. 文件是否成功写入？

### 原则四：Tauri 桌面开发的特殊注意事项

1. **`window.__TAURI__` 注入时序**: 在模块加载时可能还不存在，必须用**运行时函数**检测：
   ```typescript
   // ❌ 错误：模块加载时执行，可能为 false
   const isTauri = window.__TAURI__;
   
   // ✅ 正确：运行时检测
   function isTauriEnv() { return !!window.__TAURI__; }
   ```

2. **前后端字段命名必须一致**: Rust 用 `#[serde(rename = "camelCase")]`，前端也必须发 camelCase。如果不确定，加 `alias` 兼容两种格式：
   ```rust
   #[serde(rename = "maxHistory", alias = "max_history")]
   ```

3. **DevTools 只在 debug 模式可用**: release 构建无法打开 DevTools，必须通过日志文件调试

4. **Tauri 1.x 的 feature flag**: `open_devtools` 等方法需要在 `Cargo.toml` 中启用对应 feature（如 `devtools`）

### 原则五：用户说"看不到"时，立刻换方式

- 用户说"exe 没有 F12" → 不要再建议按 F12
- 用户说"日志没有变化" → 不要再加同类日志
- **立刻换一种让用户能看到信息的方式**（写文件、弹窗、UI 提示等）

---

## Git 提交历史摘要

### 存储功能修复历程（教训总结）
| 提交 | 说明 | 反思 |
|------|------|------|
| `88c2f1b` | **最终修复**: Settings serde alias 兼容 snake_case | 这才是真正的 bug，但前面花了 14 轮才定位到 |
| `9f14d94` | 前端日志写文件（log_from_frontend 命令） | 如果一开始就做这个，能省 10 轮 |
| `5130ce0` | DevTools 命令修复 | release 不支持，方向错误 |
| `e92c677` | 添加 DevTools 按钮 | 方向错误 |
| `232251e` | isTauri 改为运行时检测 | 真正的 bug #1 |
| `515da5e` | 添加详细保存流程日志 | 看不到，白加 |
| `ef0a870` | 保存/加载 current_request | 有用但不是根因 |

### 其他功能提交
| 提交 | 说明 |
|------|------|
| `ab544be` | 添加 Collection 设置入口 |
| `874f97f` | 修复 ParamsTab 创建多行（ref + localParams 双轨） |
| `adf84bb` | 用 record.id 判断空行（仍有问题） |
| `26c796c` | 只在 key 列 onChange 时添加新行（仍有问题） |
| `b20e818` | ParamsTab 使用本地 state + blur 同步（基础正确） |
| `959569e` | 恢复 useEffect 异步同步 URL |
| `198aaa5` | UI 修复：地址栏固定、ENV 简化、删除无用按钮 |
| `61eb5e6` | 统一保存逻辑、修复 setCurrentRequest 包含 auth/variables |
| `63a72d2` | 修复 Authorization 组件绑定 |
| `df83b84` | 修复 EnvironmentPanel 同步、自动保存订阅 |
| `f1f40a0` | 添加 Environment 和 Collection 存储支持 |
| `40ec39f` | 完成 Auth/Variables/Env 管理等 6 大功能 |
| `39be0d8` | 修复存储自动同步到 collections |
