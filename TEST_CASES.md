# dogHttpClient 系统性测试用例

## 一、界面与布局测试

### TC-UI-001: 主界面布局
- **步骤**: 打开应用，检查主界面布局
- **预期**: 左侧Sidebar，中间Request面板，右侧Response面板，布局正常无错位

### TC-UI-002: 左上角Logo和标题
- **步骤**: 检查左上角dogHttpClient图标和文字
- **预期**: 图标24x24，文字16px，垂直居中对齐

### TC-UI-003: Sidebar折叠/展开
- **步骤**: 点击左上角菜单按钮折叠/展开Sidebar
- **预期**: Sidebar平滑动画，按钮图标正确切换

### TC-UI-004: 响应式布局
- **步骤**: 调整窗口大小
- **预期**: 各面板自适应，无内容截断

---

## 二、请求创建与编辑测试

### TC-REQ-001: 创建新请求 (+New按钮)
- **步骤**: 点击"+ New"按钮
- **预期**: 创建新请求，名称为"New Request N"(自动递增)，默认GET方法

### TC-REQ-002: 修改请求方法
- **步骤**: 点击Method下拉，选择POST/PUT/DELETE等
- **预期**: 方法正确切换，Body区域相应显示/隐藏

### TC-REQ-003: 输入URL
- **步骤**: 在URL输入框输入https://api.example.com/users
- **预期**: URL正确显示，无异常

### TC-REQ-004: URL参数自动解析
- **步骤**: 输入URL带参数 https://api.example.com/users?id=1&name=test
- **预期**: 自动解析到Params表格，显示id=1, name=test

### TC-REQ-005: 添加/删除Params
- **步骤**: 在Params标签添加、编辑、删除参数
- **预期**: 参数正确增删改，URL自动更新

### TC-REQ-006: Params启用/禁用
- **步骤**: 切换Params行的启用开关
- **预期**: 禁用的参数不加入URL，启用的加入

---

## 三、Headers测试

### TC-HDR-001: 添加Headers
- **步骤**: 在Headers标签添加Content-Type: application/json
- **预期**: Header正确显示，Send时包含在请求中

### TC-HDR-002: 预设Headers
- **步骤**: 检查新请求默认Headers
- **预期**: 默认包含Accept和Content-Type

### TC-HDR-003: Headers启用/禁用
- **步骤**: 禁用某个Header后发送请求
- **预期**: 禁用的Header不包含在请求中

### TC-HDR-004: 批量编辑Headers
- **步骤**: 尝试多行编辑Headers
- **预期**: 支持批量粘贴key: value格式

---

## 四、Body测试 - Raw

### TC-BODY-RAW-001: JSON Body
- **步骤**: 选择Body类型Raw，输入{"name":"test","age":18}
- **预期**: 正确显示，Content-Type自动/手动设置application/json

### TC-BODY-RAW-002: XML Body
- **步骤**: 选择Raw类型为XML，输入<user><name>test</name></user>
- **预期**: 正确显示，可切换Raw类型

### TC-BODY-RAW-003: Text Body
- **步骤**: 选择Raw类型为Text，输入纯文本
- **预期**: 正确显示

---

## 五、Body测试 - Form Data

### TC-BODY-FORM-001: 添加文本字段
- **步骤**: 选择form-data，添加key=value文本字段
- **预期**: 字段正确显示，Send时以multipart/form-data发送

### TC-BODY-FORM-002: 添加文件字段
- **步骤**: 选择form-data，添加文件字段，选择本地文件
- **预期**: 文件名显示，文件内容被读取(base64存储)，Send时文件内容被发送

### TC-BODY-FORM-003: 混合字段
- **步骤**: form-data中同时有文本字段和文件字段
- **预期**: 都能正确发送

### TC-BODY-FORM-004: 禁用字段
- **步骤**: 禁用部分form-data字段后发送
- **预期**: 禁用的字段不包含在请求中

---

## 六、Body测试 - x-www-form-urlencoded

### TC-BODY-URLENC-001: 添加键值对
- **步骤**: 选择x-www-form-urlencoded，添加key=value
- **预期**: 正确编码为key=value&key2=value2格式发送

---

## 七、Body测试 - Binary

### TC-BODY-BIN-001: 选择文件
- **步骤**: 选择Binary类型，选择文件
- **预期**: 文件名显示，文件内容被读取

---

## 八、发送请求测试

### TC-SEND-001: GET请求
- **步骤**: 输入GET URL，点击Send
- **预期**: 正确发送，显示响应状态、Headers、Body

### TC-SEND-002: POST请求(JSON)
- **步骤**: POST方法，Raw JSON Body，点击Send
- **预期**: 正确发送JSON，响应正确显示

### TC-SEND-003: POST请求(Form Data)
- **步骤**: POST方法，form-data Body，点击Send
- **预期**: 以multipart/form-data发送，后端能正确接收

### TC-SEND-004: 请求超时处理
- **步骤**: 发送请求到无响应的服务器
- **预期**: 显示超时错误或连接失败

### TC-SEND-005: 错误处理
- **步骤**: 输入无效URL发送请求
- **预期**: 友好错误提示

---

## 九、响应处理测试

### TC-RESP-001: 响应状态显示
- **步骤**: 发送请求，检查响应状态
- **预期**: 正确显示HTTP状态码(200, 404, 500等)

### TC-RESP-002: 响应Headers显示
- **步骤**: 发送请求，查看Headers标签
- **预期**: 响应Headers正确显示

### TC-RESP-003: 响应Body格式化(Pretty)
- **步骤**: 接收JSON响应，查看Pretty标签
- **预期**: JSON格式化高亮显示

### TC-RESP-004: 响应Body原始(Raw)
- **步骤**: 查看Raw标签
- **预期**: 原始响应内容

### TC-RESP-005: 响应Body预览(Preview)
- **步骤**: HTML响应查看Preview
- **预期**: HTML渲染预览

### TC-RESP-006: 响应时间显示
- **步骤**: 发送请求
- **预期**: 正确显示响应时间(ms)

### TC-RESP-007: 响应大小显示
- **步骤**: 发送请求
- **预期**: 正确显示响应大小(bytes)

### TC-RESP-008: Save Response功能
- **步骤**: 点击Save Response按钮
- **预期**: 根据Content-Type自动选择扩展名，正确下载文件

---

## 十、Collection管理测试

### TC-COLL-001: 创建Collection
- **步骤**: 点击"New Collection"，输入名称
- **预期**: Collection创建成功，名称唯一

### TC-COLL-002: Collection名称唯一性
- **步骤**: 尝试创建同名Collection
- **预期**: 提示名称已存在

### TC-COLL-003: 重命名Collection
- **步骤**: 右键Collection，选择重命名
- **预期**: 重命名成功，名称唯一性检查

### TC-COLL-004: 删除Collection
- **步骤**: 右键Collection，选择删除
- **预期**: Collection删除，请求移动到Scratch Pad

### TC-COLL-005: 在Collection中创建Request
- **步骤**: 在Collection上点击"+"创建请求
- **预期**: 请求创建在Collection中，名称自动递增

### TC-COLL-006: Request名称唯一性
- **步骤**: 在同一Collection中创建同名请求
- **预期**: 提示名称已存在

### TC-COLL-007: 保存请求到Collection
- **步骤**: 编辑请求后保存
- **预期**: 请求保存到当前Collection

---

## 十一、Import功能测试

### TC-IMP-001: 导入cURL命令
- **步骤**: 点击Import，粘贴cURL命令
- **预期**: 正确解析method, url, headers, body

### TC-IMP-002: 导入cURL - 复杂命令
- **步骤**: 粘贴带--location, --form, --data-raw的cURL
- **预期**: 正确解析所有参数

### TC-IMP-003: 导入cURL - 不支持的选项
- **步骤**: 粘贴带-v, -o, --proxy等不支持选项的cURL
- **预期**: 导入成功，显示警告提示不支持的选项

### TC-IMP-004: 导入后Headers回显
- **步骤**: 导入带-H的cURL，检查Headers标签
- **预期**: Headers正确显示

### TC-IMP-005: 导入后Form Data回显
- **步骤**: 导入带--form的cURL，检查Body标签
- **预期**: Form Data正确显示

---

## 十二、Code生成测试

### TC-CODE-001: cURL代码生成
- **步骤**: 编辑请求后，查看Code标签
- **预期**: 正确生成cURL命令

### TC-CODE-002: cURL代码包含Body
- **步骤**: POST请求带Body，查看Code
- **预期**: cURL包含-d或--form参数

### TC-CODE-003: cURL代码包含Headers
- **步骤**: 请求带Headers，查看Code
- **预期**: cURL包含-H参数

### TC-CODE-004: cURL文件名引号处理
- **步骤**: form-data文件字段，文件名含空格或中文
- **预期**: 文件名正确引号包裹

---

## 十三、History测试

### TC-HIST-001: 请求历史记录
- **步骤**: 发送多个请求
- **预期**: History中显示请求记录

### TC-HIST-002: 从历史恢复请求
- **步骤**: 点击History中的请求
- **预期**: 请求配置恢复到当前

---

## 十四、性能测试

### TC-PERF-001: 大响应处理
- **步骤**: 请求返回大JSON(>1MB)
- **预期**: 界面不卡顿，Pretty格式化正常

### TC-PERF-002: 并发请求
- **步骤**: 快速连续发送多个请求
- **预期**: 无异常，状态正确

---

## 十五、边界测试

### TC-EDGE-001: 空URL发送
- **步骤**: URL为空时点击Send
- **预期**: 提示输入URL或无任何操作

### TC-EDGE-002: 特殊字符URL
- **步骤**: URL包含中文、空格、特殊符号
- **预期**: 正确编码处理

### TC-EDGE-003: 超长Body
- **步骤**: Body内容超长(>10MB)
- **预期**: 正常处理，不崩溃

### TC-EDGE-004: 大量Headers
- **步骤**: 添加50+ Headers
- **预期**: 正常显示和发送

---

## 测试执行记录

| 用例ID | 执行结果 | 问题描述 | 修复状态 |
|--------|----------|----------|----------|
| TC-UI-001 | ⬜ | | |
| TC-UI-002 | ⬜ | | |
| ... | ... | ... | ... |

---

## 测试环境

- OS: Windows/macOS/Linux
- Node.js: 18+
- Tauri: 1.x
- 测试服务器: httpbin.org, postman-echo.com, 本地服务器
