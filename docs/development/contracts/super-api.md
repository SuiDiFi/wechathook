# 契约：Super API（bot-server :8788）

对齐萌兔官方 `/super/msg/*`，供 inject 壳、relay-bridge、gateway relay 调用。

---

## 健康检查

```
GET /health
→ { "ok": true, "service": "wechathook-bot-server", "port": 8788 }
```

---

## POST `/super/msg/callback`

**用途：** 群文本消息 → 业务回复（签到 / 菜单 / 查有效期 / `#` 插件）

**入参（节选）：**

```json
{
  "msg": {
    "event_type": 2000,
    "msgType": 1,
    "acc_wxid": "along523618",
    "account_wxid": "along523618",
    "fromUserName": { "String": "57226609398@chatroom" },
    "real_content": "签到",
    "room_sender_by": "wxid_xxx",
    "member_info": { "nickName": "昵称" }
  }
}
```

**出参：**

```json
{
  "status": 1,
  "msg": "suc",
  "data": [
    {
      "msg_type": 1,
      "acc_wxid": "along523618",
      "to_wxid": "57226609398@chatroom",
      "wxid": "57226609398@chatroom",
      "content": "..."
    }
  ]
}
```

**前置条件：**

- 群在 `config/groups/` 或 explis 授权内  
- `acc_wxid` 与群 `replyAccount` 一致  
- 文本完全匹配 op 关键词（如 sign 的 `keyword`）

**实现：** `packages/bot-core/src/super-server.ts`

---

## POST `/super/msg/explis`

**入参：** `{ "group_wxid": "57226609398@chatroom" }` 或逗号分隔多群

**出参：**

```json
{
  "status": 1,
  "msg": "suc",
  "data": [{ "group_wxid": "...", "expires": 1893456000 }]
}
```

未授权群：`status: 0`, `msg: "not dat"`

---

## POST `/super/msg/lis` / `/super/msg/scu`

**行为：** 对齐萌兔心跳 / 配置同步；当前实现返回 `{ "status": 1, "msg": "suc" }`。

---

## Relay 转发

relay-bridge（`:8789`）将 `/super/*` 原样转发至 `config/relay-bridge.yaml` 中的 `botServer` URL。

**验收：**

```powershell
pnpm e2e:mvp
pnpm e2e:inject   # gateway + bot-server 路径
```
