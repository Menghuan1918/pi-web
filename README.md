# Pi Web

[中文文档](./README.zh-CN.md) | [日本語](./README.ja.md)

A fork of [agegr/pi-web](https://github.com/agegr/pi-web) — the local web UI for the [pi coding agent](https://github.com/badlogic/pi-mono). This fork adds special adaptations for [pi-atlas](https://github.com/Menghuan1918/pi-atlas) and is meant to be run from source.

## Run from source

Requires Node.js 22.19.0 or newer.

```bash
git clone https://github.com/Menghuan1918/pi-web.git
cd pi-web
npm install
npm run dev
```

Then open [http://127.0.0.1:30141](http://127.0.0.1:30141). The server listens on `127.0.0.1` by default.

Options (`PORT`, `PI_WEB_HOSTNAME`, `PI_WEB_NO_OPEN`, etc.) and HTTP proxy (`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`) work the same as upstream — see the [upstream README](https://github.com/agegr/pi-web#readme) for the full reference.

Pi Web has no application-level authentication and can invoke a high-privilege agent. Do not expose it to the internet; only use non-loopback bindings on a trusted network.

## pi-atlas integration

This fork ships two special adaptations for [pi-atlas](https://github.com/Menghuan1918/pi-atlas) — an event-driven extension set (async bash & sub-agent tasks, goal-driven auto-continue, Feishu notifications) that turns pi into a self-driving agent for infra/SRE work.

Pi Web runs pi-atlas transparently: install pi-atlas as a normal pi extension and Pi Web runs it in `rpc` mode. Most of pi-atlas (guard follow-up messages, target auto-continue, Feishu notifications) just flows through Pi Web's existing SSE event bridge — no web-specific code needed. Two things did need Pi Web-side work:

- **Sub-agent process spawning.** The pi-atlas `task` extension spawns sub-agents via `create_agent` by re-launching the pi CLI derived from `process.argv[1]`. Under Pi Web's Next.js server, `argv[1]` points at the Next CLI, so spawned agents failed instantly with `unknown option '--mode'`. `lib/rpc-manager.ts` points `argv[1]` at the real pi CLI (`dist/cli.js`) at session start so sub-agents spawn correctly (falls back to `pi` on PATH if the entry can't be resolved).
- **Inline `ask_user` panel.** pi-atlas's `ask_user` asks its questions through `extension_ui_request` events. `components/AskUserInlinePanel.tsx` renders them inline in the chat bubble — highlighting the active question, showing submitted answers, mirroring the TUI multi-question experience — and correlates the request back to the originating tool call across page refreshes. It accepts both the `ask_user` and legacy `AskUser` tool names.

See the pi-atlas [architecture doc](https://github.com/Menghuan1918/pi-atlas/blob/main/docs/principles.md) for the full event-driven loop.
