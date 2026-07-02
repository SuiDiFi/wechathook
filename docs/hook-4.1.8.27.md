# Hook 4.1.8.27 对接说明

本项目的 gateway 已适配你本地的 Hook 框架：

- **Hook 框架路径**: `D:\HOOK\HOOK 4.1.8.27\4.1.8.27`
- **Hook HTTP API 端口**: `19088`（`http_server_port`）
- **统一回调入口**: `POST http://127.0.0.1:8787/api/recvMsg`

## 注入配置 JSON

启动 gateway 后，控制台会打印推荐 inject 配置，与 `命令行参数.txt` 格式一致：

```json
{
  "recivemode": "http",
  "tcp_ip": "127.0.0.1",
  "tcp_port": 61108,
  "http_server_port": 19088,
  "http_callback_url": "http://127.0.0.1:8787/api/recvMsg",
  "usedefault": false,
  "start_server_while_login": true
}
```

## inject 命令示例

**你的微信路径**：`C:\Program Files\Tencent\weixin\Weixin.exe`

快捷方式：以**管理员**运行 [`scripts/inject-wechat.cmd`](../scripts/inject-wechat.cmd)（需先 `pnpm start` 启动 gateway）。

手动命令（在 `D:\HOOK\HOOK 4.1.8.27\4.1.8.27` 目录下，管理员 CMD）：

```
"x64 inject.exe" "C:\Program Files\Tencent\weixin\Weixin.exe" "D:\HOOK\HOOK 4.1.8.27\4.1.8.27\libGLESv1.dll" "{\"recivemode\":\"http\",\"tcp_ip\":\"127.0.0.1\",\"tcp_port\":61108,\"http_server_port\":19088,\"http_callback_url\":\"http://127.0.0.1:8787/api/recvMsg\",\"usedefault\":false,\"start_server_while_login\":true}"
```

## 接收模式

| 模式 | 配置 | 说明 |
|------|------|------|
| HTTP | `hook.receiveMode: http` | Hook POST 到 `/api/recvMsg`（推荐，与 C# VXHook demo 一致） |
| TCP | `hook.receiveMode: tcp` | gateway 监听 `61108`，4 字节大端长度头 + JSON |

## 出站 API

所有发送消息调用 Hook 的 `http://127.0.0.1:19088/api/*` 接口，与 Apifox 文档一致。
