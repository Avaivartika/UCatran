# UCL Study 0.3 — Pi architecture

Renderer → restricted Electron IPC → desktop/agent/runtime.mjs → Pi Agent
Pi Agent → pi-ai openai-completions streaming adapter → configured model endpoint
Pi Agent → desktop/agent/tools.mjs → host dispatch → Python Moodle bridge / local services

## Ownership

- `desktop/agent/runtime.mjs`: configuration, legacy history conversion, Pi lifecycle, event mapping, cancellation, eight-turn budget. It does not implement its own LLM/tool execution loop.
- `desktop/agent/tools.mjs`: four first-party connector groups (Moodle, library, tasks, service directory). TypeBox schemas become Pi AgentTool definitions. Tools run sequentially because the Python line bridge is sequential.
- `desktop/main.cjs`: OS integration, encrypted credentials, persistent workspace, RPC process management, API-data consent and access boundaries.
- `desktop/core.cjs`: shared URL/path validation and dynamic ESM runtime entry.
- `scripts/bridge.py` and `vendor/moodle-mcp`: read-only Moodle API and browser SSO integration.
- `renderer/app.js`: streamed assistant text, tool execution events and existing course/library/task UI.

## Pi provenance

Reviewed SJTU-Geek/pi main package manifests on 2026-11-06:
https://github.com/SJTU-Geek/pi/tree/main/packages/agent
https://github.com/SJTU-Geek/pi/tree/main/packages/ai

They declare 0.84.4. This app pins the official upstream npm packages
@earendil-works/pi-agent-core and @earendil-works/pi-ai to 0.84.4, with resolved
integrity in package-lock.json. It does not claim to include all SJTU fork changes
or Jaide desktop source. No third-party plugin loading or plugin-market protocol
compatibility is claimed.

## Sessions and migration

Existing settings, local tasks, files and displayed chats are unchanged. Legacy
plain chats are converted to Pi messages on first request. Subsequent successful
runs save full Pi AgentMessage history, including tool calls and tool results, in
workspace.json's agentSession. Clear chat clears both display and engine state.
Failed/cancelled runs are shown as errors but do not commit a half-finished Pi
session. User chat failures are not replayed as invented assistant replies.

## Boundaries

Pi provides agent execution, not OS authorization. The host still restricts tools,
file paths, downloads, links, API endpoint schemes and renderer privileges.
Credentials are not included in tool results. No Pi coding-agent shell or general
filesystem tools are loaded. The model endpoint is user configured and requires
explicit in-app data consent. Provider fetch refuses redirects carrying API keys.
