# Pi Web

[English](./README.md) | [日本語](./README.ja.md)

[agegr/pi-web](https://github.com/agegr/pi-web) 的 fork——pi 编程智能体的本地网页界面。本 fork 为 [pi-atlas](https://github.com/Menghuan1918/pi-atlas) 做了专门适配，建议从源码运行。

## 从源码运行

要求 Node.js 22.19.0 或更高版本。

```bash
git clone https://github.com/Menghuan1918/pi-web.git
cd pi-web
npm install
npm run dev
```

启动后打开 [http://127.0.0.1:30141](http://127.0.0.1:30141)。默认仅监听 `127.0.0.1`。

可选参数（`PORT`、`PI_WEB_HOSTNAME`、`PI_WEB_NO_OPEN` 等）和 HTTP 代理（`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`）与上游一致——完整参考见[上游 README](https://github.com/agegr/pi-web#readme)。

Pi Web 没有应用层身份验证，并且可以调用高权限智能体。请勿将其暴露到互联网；仅在可信网络中使用非 loopback 监听地址。

## pi-atlas 集成

本 fork 为 [pi-atlas](https://github.com/Menghuan1918/pi-atlas) 做了两处专门适配——pi-atlas 是一组事件驱动扩展（异步 bash 与子代理任务、目标驱动自动续跑、飞书通知），把 pi 变成面向 infra/SRE 工作的自驱动 Agent。

Pi Web 透明地运行 pi-atlas：把 pi-atlas 作为普通 pi 扩展装好，Pi Web 就以 `rpc` 模式运行它。pi-atlas 的大部分能力（guard 续跑消息、target 自动续跑、飞书通知）直接走 Pi Web 既有的 SSE 事件桥，无需 web 侧专门改代码。只有两处需要 Pi Web 侧做工作：

- **子代理进程 spawn。** pi-atlas 的 `task` 扩展通过 `create_agent` 派生子代理，方式是从 `process.argv[1]` 推导出 pi CLI 并重跑。在 Pi Web 的 Next.js 服务端进程下，`argv[1]` 指向的是 Next CLI，派生出的子代理会立即报 `unknown option '--mode'` 失败。`lib/rpc-manager.ts` 在会话启动时把 `argv[1]` 指向真正的 pi CLI（`dist/cli.js`），让子代理正确 spawn（解析不到入口时回退到 PATH 上的 `pi`）。
- **内联 `ask_user` 面板。** pi-atlas 的 `ask_user` 通过 `extension_ui_request` 事件逐一提问。`components/AskUserInlinePanel.tsx` 把问题内联渲染在聊天气泡里——高亮当前问题、显示已提交答案、镜像 TUI 的多问题体验——并通过回溯把请求关联到发起它的 tool call，页面刷新中途也能重建待答问题。同时接受 `ask_user` 与历史 `AskUser` 两个工具名。

完整的闭环事件流见 pi-atlas 的[架构文档](https://github.com/Menghuan1918/pi-atlas/blob/main/docs/principles.md)。
