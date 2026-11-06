# Windows 0.6.0：助手控制与独立安装包验收

日期：2026-11-06（Asia/Shanghai）。在 0.5.1 修复分支继续开发。

## 用户反馈与修复

用户在已安装应用中遇到 `Cannot find package 'partial-json' imported from ... pi-ai/dist/utils/json-parse.js`。检查已安装和 0.5.1 归档，确实缺少 partial-json 等间接依赖。之前构建时使用了指向另一个开发副本的 node_modules 目录链接，依赖收集不完整；在开发目录里启动成品时，Node 会从外部开发依赖兜底解析，因此原验收没有揭示这一问题。

0.6.0 使用独立、非链接的 npm ci 依赖目录重新打包。afterPack 增加运行依赖归档检查，从应用 package.json 递归检查所有非可选依赖；缺包直接终止打包。旧安装包无法通过该检查，新归档通过，共 96 个包清单。校验程序为 scripts/verify-runtime.cjs。

## 学习助手新增能力

- 对话页直接选择模型；Codex 登录读取本机 models_cache.json，自定义 API 显式刷新 `/models`，也可手动输入模型 ID。目录来源明确标注，不把目录存在视作实际服务授权保证。
- 推理强度：自动或模型目录实际公布的强度。未知自定义模型提供常用强度，服务不支持时提示调整为自动。自动不附加 reasoning 参数。
- 参数真正传入请求：Responses/Codex 使用 reasoning.effort；Chat Completions 使用 reasoning_effort。避开上游简化接口对扩展强度的静默降级。
- 导入 Codex 时同时读取 model_reasoning_effort。模型选择和运行设置重启后保留；切换模型清除旧内部工具会话，保留可见对话历史。
- 工具权限：自动、只读、关闭。只读模式从执行工具表中移除 add_todo，即使模型臆造该工具也不能执行。
- 工具循环上限 1–32、任务超时 30–900 秒。自定义 API 可设置输出 tokens 上限 256–65536；Codex 通道不展示无效的输出长度控件，长度由服务决定。
- 回复标注实际模型、推理设置和轮数；推理阶段给出状态，不暴露内部推理内容。新增消息与流式内容自动跟随滚动，用户向上阅读时停止跟随。
- 保留原有字体、配色、背景和桌宠。

## 验证环境

将最终 win-unpacked 成品复制到系统临时目录 `UCatran-0.6.0-standalone-*`，从该外部目录启动测试，应用工作目录也在该处，避免开发仓库祖先路径上的 node_modules 兜底。所有测试使用隔离数据目录，没有修改真实用户数据或 Codex 登录文件。

## 已通过的验证

- Node 单元测试：28 项通过，覆盖三种协议的推理参数、扩展强度不降级、只读权限实际拦截、工具预算、网络错误与取消。
- 新模型设置界面：刷新模型目录、切换模型、设置高推理、只读工具、输出 tokens、循环上限和超时；抓取模拟服务实际请求确认参数；窄窗口及重启持久化通过。
- 成品外部目录八组桌面回归：agent-settings-smoke、connection-smoke、smoke、agent-smoke、codex-smoke、connector-smoke、appearance-smoke、pet-drag-smoke 全部通过。
- 包内 Python 实际读取中文及空格路径；密钥加密保存并重启恢复通过。
- 真实模型测试在同一外部成品上进行：选择 gpt-6.1-sol、推理强度 low，收到“连接成功”，分阶段连接测试成功。

真实模型成功调用 library、read_document，读取中文 TXT，正确引用来源编号 `UCATRAN-TEST-1106`；调用 add_todo 新增“猫然真实工具验收”、日期 `2026-11-10`，重启后待办与对话均恢复。测试只使用合成资料和测试待办，不使用私人课程数据。

## 使用

安装 `dist/UCatran-0.6.0-windows-x64-setup.exe`，替代 0.5.1；或解压 `dist/UCatran-0.6.0-win-x64.zip` 后运行。应用设置及数据目录保持 `UCL Study`。在学习助手顶部选择模型和推理强度，点击“应用设置”，下次发送生效。

未进行真实 UCL SSO/MFA 验收；没有新增任意桌面、Shell 或通用浏览器控制能力。

参数参考：[OpenAI 推理模型文档](https://developers.openai.com/api/docs/guides/reasoning)。
