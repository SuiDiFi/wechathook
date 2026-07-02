# Hook 对接

本项目对接 **Hook 4.1.8.27** 个人微信框架。Hook 框架目录：

```
D:\HOOK\HOOK 4.1.8.27\4.1.8.27\
├── x64 inject.exe
├── libGLESv1.dll
└── WeChatWin_4.1.8.27.exe
```

微信安装路径（已验证 4.1.8.27）：

```
C:\Program Files\Tencent\weixin\Weixin.exe
```

完整 inject 说明见 [../hook-4.1.8.27.md](../hook-4.1.8.27.md)。

## 端口与地址

| 角色 | 地址 | 说明 |
|------|------|------|
| Hook 出站 API | `http://127.0.0.1:19088` | 发消息、查资料、群列表等 |
| Gateway 入站 | `http://127.0.0.1:8787` | 接收 Hook 回调 |
| 统一回调 | `POST /api/recvMsg` | Hook HTTP 模式推送入口 |
| TCP 接收（可选） | `61108` | 4 字节大端 + JSON |

## 启动顺序

```
1. pnpm start          → Gateway 8787 就绪
2. inject-wechat.cmd   → 注入微信，写入回调 URL
3. 登录微信
4. 群内发 #帮助        → 验证全链路
```

## inject 配置 JSON

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

Gateway 启动时会在控制台打印推荐配置（`buildHook41827InjectConfig`）。

## 入站：回调格式

Hook 将所有事件 POST 到 `/api/recvMsg`，Gateway 通过 `routeHookCallbackSync` 分类：

| 类型 | 识别依据 |
|------|----------|
| 群消息 | `fromUserName.String` 以 `@chatroom` 结尾 |
| 进群 | `messageType` 含「进群」/ `member_join` 等 |
| 退群 | `messageType` 含「退群」/ `member_leave` 等 |

### 群消息标准化字段

Hook 原始 JSON → `NormalizedMessage`：

| 内部字段 | Hook 来源 |
|----------|-----------|
| `eventId` | `newMsgId` |
| `roomId` | `fromUserName.String` |
| `senderWxid` | `member_info.userName` |
| `senderNick` | `sender_nick` / `member_info.nickName` |
| `content` | `real_content` |
| `msgType` | `msgType`（1=文本，3=图片…） |
| `raw` | 完整原始 payload |

实现：`packages/hook-adapter/src/hook4x-adapter.ts`

## 出站：已封装 API

`Hook4xAdapter` 已实现：

| 方法 | Hook 端点 | 请求体 |
|------|-----------|--------|
| `sendText(roomId, msg)` | `POST /api/send_text_msg` | `{ wxid, msg }` |
| `sendAt(roomId, wxids, msg)` | `POST /api/send_at_text` | `{ roomId, wxids, msg }` |
| `kickMember(roomId, wxid)` | `POST /api/del_member_from_chat_room` | `{ room_id, wxid_list }` |
| `getGroupMembers(roomId)` | `POST /api/get_chatroom_member_list` | `{ room_id }` |

### 常用调试 API（直接 curl）

```powershell
# 个人资料（须 POST）
curl.exe -s -X POST http://127.0.0.1:19088/api/get_profile_cache `
  -H "Content-Type: application/json" -d "{}"

# 群列表
curl.exe -s -X POST http://127.0.0.1:19088/api/get_chatroom_list `
  -H "Content-Type: application/json" -d "{}"

# 发文本到群
curl.exe -s -X POST http://127.0.0.1:19088/api/send_text_msg `
  -H "Content-Type: application/json" `
  -d "{\"wxid\":\"xxx@chatroom\",\"msg\":\"hello\"}"
```

> Hook 4.x 多数接口要求 **POST**，GET 会返回 `405`。

完整 API 索引见桌面 `hook调用接口.txt` 或 Apifox 文档。

## 适配层扩展

新增 Hook 实现步骤：

1. 在 `packages/hook-adapter/src/` 新建 `xxx-adapter.ts`
2. 实现 `IHookClient` 接口
3. 提供对应的 `normalize*` 函数
4. 在 `BotEngine` 中按配置选择 adapter

插件层**无需修改**。

## 注意事项

- inject 时 JSON 必须带引号；失败时回调 URL 不会生效
- 重新 inject 可能需重新登录微信
- 个人微信 Hook 有封号风险，勿用于主号高频自动化
- 发朋友圈等高危 API  intentionally 未封装
