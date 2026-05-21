# 任务计划：dogHttpClient 持续开发与维护

## 目标
构建一个轻量级、跨平台的 API 测试桌面工具（类似 Postman），基于 Tauri + React + TypeScript。

## 当前阶段
阶段 3（已完成的修复进入维护期，待验证 ParamsTab 修复效果）

## 各阶段

### 阶段 1：基础功能开发 ✅
- [x] HTTP 请求发送（GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS）
- [x] Query Params 编辑与 URL 双向同步
- [x] Headers 键值对编辑
- [x] Body 支持 Raw/Form-data/x-www-form-urlencoded/Binary
- [x] 响应展示（Pretty JSON/Raw/Preview）
- [x] 请求历史记录
- [x] Collections 管理
- [x] Environments 环境变量管理
- [x] Authorization 支持（Basic/Bearer/API Key/OAuth2）
- [x] Collection Variables 与变量替换 {{var}}
- [x] cURL 代码生成
- [x] Import cURL 命令
- **状态：** complete

### 阶段 2：存储与持久化 ✅
- [x] Tauri FS API 本地 JSON 文件存储
- [x] 浏览器 localStorage 兼容（开发调试用）
- [x] 自动保存（1秒防抖）
- [x] 手动保存（Ctrl+S / Save 按钮）
- [x] setCurrentRequest 同步到 collections
- **状态：** complete

### 阶段 3：Bug 修复与 UI 优化 🔄
- [x] 存储不工作（setCurrentRequest 包含 auth/variables）
- [x] Environment 重复标题（简化为单列布局）
- [x] Active 按钮缺失（点击即激活）
- [x] 切换环境后右边无变化（直接用 currentEnvironmentId）
- [x] Auth 类型下拉不响应
- [x] History 不显示
- [x] URL 地址栏固定布局
- [x] 移除无用 UI 元素
- [ ] **ParamsTab 输入创建多行**（已提交修复，待桌面应用验证）
- [ ] VALUE 列输入时 UI 不实时更新
- [ ] `displayParams` 死代码清理
- **状态：** in_progress

### 阶段 4：待开发功能
- [ ] Collections 文件存储系统
- [ ] Postman 导入/导出
- [ ] WebSocket 支持
- [ ] GraphQL 支持
- [ ] 批量运行 Collection
- [ ] dog 脚本引擎
- **状态：** pending

### 阶段 5：交付
- [ ] 所有已知 Bug 修复
- [ ] 桌面应用完整测试
- **状态：** pending

## 关键问题
1. ParamsTab 修复后在 Tauri 桌面应用中是否正常？（待用户验证）
2. VALUE 列只更新 ref 不更新 localParams，是否需要修复？

## 已做决策
| 决策 | 理由 |
|------|------|
| ParamsTab 用 ref + localParams 双轨 | 避免 React 批处理导致每字符创建新行 |
| onChange 不添加新行，只在 blur/Enter 时 syncToStore | 防止输入过程中触发不必要的 store 更新 |
| emptyRowId 用 useMemo 稳定 | 避免每次渲染生成新 ID 导致输入框失焦 |
| URL/Params 同步传 skipDirty=true | 避免循环标记脏导致无限保存 |
| 环境变量编辑器全屏展示 | 侧边栏只有 220px，放不下编辑器 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| Params 输入每字符创建一行 | 4 | ref + localParams 双轨，onChange 只更新不添加 |
| 用 index 判断空行 | 1 | 失败，index 总指向最后一行 |
| 用 record.id 判断空行 | 1 | 失败，空行就是当前行，每次都添加 |
| URL/Params 循环更新 | 2 | paramsGeneratedUrl 比较 + skipDirty 参数 |
| 编译错误 onParamsChange 不存在 | 1 | 移除废弃的 props 接口 |

## 备注
- 随着进度更新阶段状态：pending → in_progress → complete
- 做重大决策前重新读取此计划
- **修改前先看 git 记录**（用户强调）
- 这是桌面应用，浏览器测试仅供参考
