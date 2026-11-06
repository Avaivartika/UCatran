# UCatran · 猫然 — 学习与日常

面向 UCL 的独立桌面学习助手，基于 [Mattlo0546/moodle-mcp](https://github.com/Mattlo0546/moodle-mcp) 构建。不是 UCL 官方产品，也不声称与 jAide 有关联。

## 安装（0.5.0）

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
