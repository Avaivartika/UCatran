# UCatran · 猫然 — 学习与日常

面向 UCL 的独立桌面学习助手，基于 [Mattlo0546/moodle-mcp](https://github.com/Mattlo0546/moodle-mcp) 构建。不是 UCL 官方产品，也不声称与 jAide 有关联。

## Windows 0.10.0 任务便签与多来源任务发现

截止日期页改为课程图片 + 任务便签，支持展开原始要求、关联资料、相关时间与在线参考。点击按钮后使用当前模型生成带来源的任务讲解，保存到本机；可选择资料并导出包含原始要求、原文件、参考链接、文件哈希及获取状态清单的 ZIP。讲解采用独立上下文，不混入其他对话。

任务发现合并逐课程可见活动、完成状态、作业/测验/选择活动专用接口、全量日历、行动日历及用户小组范围；批量接口失败后逐课程重试。没有日期的活动、过去日期和未知完成状态均保留，失败课程保留旧记录并显示读取缺口。助手查询支持完整分页，避免以单页或日历推断任务总量。课程活动和日历事项不自动视为必交作业；学校未开放、接口报错或账号无权查看的信息会明确标注。

全界面改用系统字体，提高正文、辅助文字及输入控件的对比度。任务资料支持 PDF、文本、DOCX、PPTX、XLSX 与 HTML 的可读文字提取；片段容量限制、图片/扫描内容未作视觉解读、读取失败会明确列出，ZIP 仍保留能获取的原始文件。

[下载 0.10.0 Windows Release](https://github.com/Avaivartika/UCatran/releases/tag/v0.10.0) · [验收记录](WINDOWS-0.10.0-VALIDATION.md)

## Windows 0.9.0 课程与资料工作区

- 课程卡片读取 Moodle 原始封面，支持搜索与排序；未提供封面的课程使用本地配色背景。
- 课程内按官网章节导航，保留说明的标题、列表、表格和受支持的图片，可搜索整门课并筛选资料或活动。
- 下载按课程、章节、活动归档；重名资料和更新版本保留已有文件。资料库支持按课程浏览、分类导入和限定课程全文检索，旧版下载提供归档整理入口。
- 设置中可上传本地主页照片、预览、调整显示位置及恢复默认。照片只保存在本机。
- 淡粉主题与美乐蒂（淡粉）、布丁狗、chiikawa 哥布林（官方头像）桌宠；修复 Moodle 日历 API 单页最多 50 条的分页限制。

Windows 安装包见 [0.9.0 Release](https://github.com/Avaivartika/UCatran/releases/tag/v0.9.0)。安装会保留现有 Moodle 登录、资料、设置与会话。

## Windows 0.8.0 完整学习工作区升级

整合自动上下文压缩、本地资料全文检索和 Agent 检索工具；模型配置改为按需打开的面板，消息区获得更多空间，回答支持安全的 Markdown 排版。保留托盘、历史会话、检查点、模型和推理强度设置。安装包为 `dist/UCatran-0.8.0-windows-x64-setup.exe`，便携版为 `dist/UCatran-0.8.0-win-x64.zip`。功能边界及测试证据见 [0.8.0 验收记录](WINDOWS-0.8.0-VALIDATION.md)。

## Windows 0.7.0 托盘与会话可靠性

关闭窗口后在托盘继续运行，点击托盘恢复，右键停止任务或退出；重复启动唤起原窗口。学习助手支持新建与恢复历史对话，工具执行后保存检查点。安装包为 `dist/UCatran-0.7.0-windows-x64-setup.exe`。详见 [验收记录](WINDOWS-0.7.0-VALIDATION.md)。

## Windows 0.6.0 助手设置与安装包修复

学习助手页支持选择模型、推理强度，以及工具权限、工具循环上限、任务超时；自定义 API 可设置最大输出 tokens。Codex 模型与推理选项来自本机模型目录，自定义服务可读取 `/models` 或手动填写模型 ID。点击“应用设置”后对下一次发送生效，重启后保留。

修复 0.5.1 安装包遗漏 `partial-json` 等间接依赖的问题，增加打包依赖完整性检查。新安装包为 `dist/UCatran-0.6.0-windows-x64-setup.exe`。验收记录见 [WINDOWS-0.6.0-VALIDATION.md](WINDOWS-0.6.0-VALIDATION.md)。

## Windows 0.5.1 修复记录（已由 0.6.0 替代）

修复 Windows 系统代理下模型请求失败，新增「测试已保存的连接」和停止测试；明确区分导入配置与真实连接成功。同一服务重复导入保留已有数据发送许可，切换导入服务仍需重新同意。HTTP、DNS、TLS 和代理错误提供可操作提示。

安装包构建到 `dist/UCatran-0.5.1-windows-x64-setup.exe`。本次没有发布 GitHub Release，也没有构建新的 macOS 安装包。修复和实测记录见 [WINDOWS-0.5.1-VALIDATION.md](WINDOWS-0.5.1-VALIDATION.md)。

## 已发布安装包（0.5.0）

- **Windows 10/11 x64**：下载 `UCatran-0.5.0-windows-x64-setup.exe`，按向导安装；ZIP 版解压后运行 UCatran.exe。
- **macOS Apple Silicon**：下载 `UCatran-0.5.0-mac-arm64.dmg`，将应用拖入 Applications。
- Windows 包未做 Authenticode 签名；macOS 包为 ad-hoc 签名，未做 Apple 公证。系统可能提示确认来源。
- Moodle 登录使用已安装的 Edge 或 Chrome，不要求用户安装 Python 或 Node。

## 首次使用

打包结果：`dist/mac-arm64/UCatran.app`。双击启动，不需要运行 Python 命令。应用内包含 Python 运行环境；Moodle 交互登录优先使用已安装的 Google Chrome。

1. 在「设置」点击「连接 / 重新登录」，在浏览器中完成 UCL SSO 和 MFA。
2. 点击「同步 Moodle」，在课程页浏览章节并下载资料，截止日期页查看 Moodle 日历事项。
3. 在「设置」填写自定义 API Base URL、模型名称、API Key。模型需支持 Chat Completions 的 tools 工具调用；Base URL 通常以 `/v1` 结尾。
4. 阅读并勾选模型数据发送选项后，即可在「学习助手」询问课程、截止日期，读取资料、规划学习或明确要求新增待办。

没有模型配置仍可使用 Moodle 课程、截止日期、下载、资料导入和本地待办。应用不会自动以示例数据替换真实连接失败。

## 功能

- 桌面工作台：课程数量、截止事项、本地待办。
- UCL Moodle 登录：继承上游浏览器 SSO/MFA 流程，自动获取 token。
- 课程：课程名称搜索、章节活动、来源链接、单文件下载。
- 截止日期：Moodle 日历查询，伦敦时区显示；不代表已核对提交状态。
- 资料库：PDF/TXT/Markdown/CSV 导入与读取；PDF 最多前 60 页 / 60000 字符，不支持 OCR。
- AI：Pi 引擎的多轮工具调用、SSE 流式回答、工具参数校验、执行记录、停止按钮、完整工具上下文持久化、自定义模型服务。
- 待办：新增、完成、删除、日期；应用运行时系统通知提醒（伦敦日期，每日一次）。
- 校园服务：UCL 官方网站入口搜索；目前不提供办理或账户数据查询。

## 数据与权限

macOS 数据位于 `~/Library/Application Support/UCL Study/`，Windows 数据位于 `%APPDATA%\UCL Study\`（实际以 Electron userData 为准）。API Key 用 Electron safeStorage 的系统加密能力保存；Moodle token 和独立浏览器会话位于应用数据下的 Moodle 目录，目录权限 0700、token 权限 0600。退出 Moodle 删除 token 和该浏览器会话，但保留本地资料。

课程缓存、聊天和待办保存在本机。配置并允许模型发送后，聊天和任务相关工具结果会发往所填写的 API 服务。Moodle token 不交给模型。模型没有任意 shell、任意文件读写或 Moodle 写入工具。下载仅允许 UCL Moodle 同源课程文件。

## 开发

```sh
npm install
npm run setup:connector
npm start
```

setup 使用 `uv` 下载独立 Python 3.12 并安装连接器依赖。只需首次准备；打包应用无需 uv。请在目标系统原生构建：macOS 执行 `npm run package:mac`，Windows 执行 `npm run package:win`。Windows 在 PowerShell 中使用 `npm.cmd` 与 `python`。

```sh
npm test
node scripts/smoke.cjs
npm run package
```

界面 smoke 测试使用隔离的数据目录及明确标注的演示数据。真实 UCL 登录需要用户参与，当前没有完成学生账户实测。真实模型调用需要用户的 API 配置；单元测试验证模拟服务的工具调用往返。

上游核心许可与本地修正见 THIRD_PARTY_NOTICES.md。原 Python 网页原型 `app.py`、`static/` 保留，桌面版本不使用它们。

## 当前边界

这是可运行的桌面首版，采用 jAide 的工作台 + 自然语言工具 + 资料 + 日程组织方式。没有复刻其上海交大专属接口。UCL 课表、图书馆个人账户、通知订阅、校园办事、云盘、插件市场尚未接入。Moodle 的移动 Web Service 是否允许当前账户登录需要实测；通用 Moodle 文档不能证明 UCL 配置。应用为本地 ad-hoc 签名构建，未进行 Apple 公证或公开发布。

## 0.3.0 架构升级

Agent 运行时使用 `@earendil-works/pi-agent-core@0.84.4`，模型传输使用 `@earendil-works/pi-ai@0.84.4`。这是 SJTU-Geek/pi 所基于的 Pi 上游发布包，同版本号不意味着包含该 fork 的全部改动。没有接入 Jaide 专属插件市场，当前仅注册本应用的四组可信工具。架构与文件划分见 ARCHITECTURE.md。

旧模型配置和对话继续兼容：第一次调用时转换旧文字历史，之后保存完整 Pi 消息（含工具调用及结果）。模型服务现在需要支持 SSE 流式 Chat Completions。

## 0.4.0 界面设计

鼠尾草绿、暖白与墨绿，全界面统一使用宋体（macOS 优先 Songti SC，回退 STSong / SimSun）；使用系统本机字体，不加载远程字体。工作台采用植物画幅与编辑式排版，待办采用双列看板，其他页面统一胶囊按钮、圆角卡片和细线分区。

生长花纹来自 tikz-flora 作者的 `@alpaca-software/web-flora@0.1.0`，本地生成并绘制水彩植物，作为页面背景的静态装饰，每 5 分钟随机更换种子；不播放生长动画，不阻挡点击。隐藏窗口暂停绘制，回到窗口时按需更新。前一版前端保存在 backups/v0.3-renderer。

## 阳光草地视觉修订

主视觉使用本地生成的阳光草地纹理（renderer/assets/sunlit-lawn.png），搭配暖白底色、树影中的白字和静态植物背景。保留全界面宋体与 tikz-flora 功能。旧宋体版样式保存在 backups/v0.4-songti。

### 从本机 Codex 一键接入

在「设置 → 模型服务」点击「一键接入 Codex」。读取 `$CODEX_HOME`（默认 `~/.codex`）的 `config.toml` 与 `auth.json`，采用当前配置档的模型和协议。

- ChatGPT 文件登录：通过 Pi 的 Codex Responses 通道连接官方服务，每次对话重新读取 access token，不复制或改写 Codex 的登录文件。登录过期时，请先在 Codex 刷新登录再重试。系统钥匙串登录暂不支持直接导入。
- API Key：导入服务地址、模型和 Responses / Chat Completions 协议，密钥使用系统加密存储。支持配置中的 `env_key`（需应用进程可见）、`experimental_bearer_token` 和 OpenAI API Key；额外认证 / 自定义请求头配置暂不导入。
- 导入会重置数据发送许可。确认模型服务后勾选许可并保存，即可使用学习助手。可在「接入方式」切回自定义 API。

配置参考：https://learn.chatgpt.com/docs/auth

### 主题与桌宠

顶部的「米黄 / 草绿」按钮可随时切换色调，也可在「设置 → 外观与桌宠」选择。两种主题都保留宋体、墙面纹理和随机斜照，选择会保存在本机。

点击角色卡片即可显示独立桌宠窗口，支持 Kitty、玉桂狗、乌撒奇、吉伊、小八和飞鼠。角色使用官方原图，保持原始比例与配色；动作是对整张原图的轻微位移，不是逐帧重绘动画。直接拖住角色移动；悬停显示控制按钮，右键展开角色菜单；点击互动，双击或点击箭头进入学习助手。桌宠会显示助手忙碌状态，退出主应用时一同退出。位置与选择会保存，默认关闭。

改名为 UCatran 后继续使用原有 UCL Study 数据目录与加密身份，保留已保存的资料、设置和登录。桌宠的闲置、点击、拖动回弹与思考动作为不规则间隔的整体位移动效，尊重系统减少动态效果设置。

## Windows 兼容与发布验证

0.5.0 提供 Windows 原生标题栏按钮、独立 Python 3.12 x64、UTF-8 中文资料读取、Edge/Chrome 登录选择、连接器进程树清理和 Windows ICO 图标。安装/升级默认保留工作区；卸载也保留用户数据。

`npm test` 检查核心逻辑，`scripts/*-smoke.cjs` 在独立临时工作区检查桌面流程。`connector-smoke.cjs` 会实际启动包内 Python、读取中文路径资料并验证密钥加密后的重启恢复；模型请求使用本地模拟服务。真实 UCL SSO/MFA 与课程数据需要本人账号，演示测试不代表已通过校方登录验收。
