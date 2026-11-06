# Windows 0.5.1 修复与验收

日期：2026-11-06（Asia/Shanghai）。基线：官方 main `dd37f0e`；开发分支：`codex/windows-reliability`。

## 已复现的故障与根因

使用已安装的 `C:\Users\catpro\AppData\Local\Programs\UCatran\UCatran.exe`，在隔离临时工作区导入本机 Codex 配置、保存数据许可，发送固定连接测试句。配置导入成功，但真实请求返回 `fetch failed`。本机 Windows 系统代理处于开启状态。

原代码把请求交给 Node 全局 fetch，未采用 Electron 的系统代理网络栈。仅将实际模型请求改为 Electron session.fetch 后，相同本机认证、模型 `gpt-6.1-sol` 和固定提示成功返回“连接成功”。没有修改全局代理配置或 Codex 登录文件。

额外失败回归发现，上游 Chat Completions SDK 会把底层 HTTP 401 包装为 `Connection error.`。运行时现在保留已处理的传输错误，界面能显示 HTTP 状态和后续操作。

## 修复内容

- 真实对话和连接测试统一使用 Electron session.fetch，跟随系统代理；禁止携带 Cookie，禁止重定向。
- HTTP 400/401/403/404/407/429/5xx 与 DNS、TLS、代理和超时错误分类提示；不回显远端错误正文，避免泄漏敏感信息。
- 新增固定文本连接测试：配置、认证信息、服务可达和模型回复；不发送历史、课程、资料，不启用工具，不写入对话。45 秒超时，可主动停止，测试期间禁止配置并发修改。
- 导入提示明确说明尚未验证网络。重复导入同一服务保留已明确授权的数据许可；导入不同服务重置许可。
- 保存按钮提供处理中状态；空白模型输出视作失败。
- 保留原有主题、字体、桌宠和 `UCL Study` 数据目录。未修改已安装应用或真实用户数据。

## 实测证据

- Node：21 项通过，包括新增网络、HTTP 脱敏、取消和 SDK 错误传递测试。
- 包内 Python 3.12：3 项连接器单元测试通过。
- Windows 打包 EXE：smoke、agent-smoke、codex-smoke、connector-smoke、appearance-smoke、pet-drag-smoke 全部通过，覆盖课程演示流程、工具闭环、中文路径、密钥重启恢复、六种桌宠、拖动与主题。
- connection-smoke：未授权不发请求、真实本地 HTTP 请求、401 提示、取消、重试、配置锁定、界面成功提示均通过；重复导入许可保留及跨服务重置通过。
- 真实 Codex：固定句收到“连接成功”；分阶段测试全部成功。
- 真实模型调用 library 和 read_document，读取中文测试 TXT，正确总结理解概念、间隔复习、练习自测，引用文件名与编号 `UCATRAN-TEST-1106`。
- 真实模型调用 add_todo，创建“猫然真实工具验收”、日期 `2026-11-10`；检查 workspace.json 写入，并重启 EXE 确认待办和对话恢复。

所有真实模型验收使用隔离临时目录和人工构造的测试资料。没有使用用户课程数据或把真实认证写入测试日志。

## 复验方式

安装或解压 0.5.1 后，在设置导入 Codex，确认数据许可并保存，点击“测试已保存的连接”。成功应显示“模型已回复 · 连接可用”。随后在资料库导入中文 TXT，要求助手总结并注明来源，再明确要求新增本地待办。

自动复验（会向当前配置的真实模型发送固定测试内容）：

```powershell
$env:UCL_STUDY_EXECUTABLE="$PWD\dist\win-unpacked\UCatran.exe"
node scripts/connection-smoke.cjs
$env:UCL_STUDY_LIVE_TOOLS='1'
node scripts/live-check.cjs
```

## 尚未验证

没有可用 UCL 账号，未进行学校 SSO/MFA、真实课程同步验收。未构建或验证新的 macOS 版本。不能据此宣称所有潜在问题已消除。

参考：[Electron net 文档](https://www.electronjs.org/docs/latest/api/net)、[Codex 配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)。
