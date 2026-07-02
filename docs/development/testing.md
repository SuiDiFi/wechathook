# 测试与调试

## 契约测试（多 Agent 集成闸门）

无需服务（CI / 任意窗口可跑）：

```powershell
pnpm contracts:static
```

需 bot-server / admin 在线：

```powershell
pnpm start:server
pnpm start:admin
pnpm contracts:runtime   # 服务离线则 SKIP 对应项
pnpm contracts           # static + runtime
```

详见 [integration-workflow.md](./integration-workflow.md) 与 [contracts/README.md](./contracts/README.md)。

## E2E 脚本

| 命令 | 依赖 | 验证 |
|------|------|------|
| `pnpm e2e:mvp` | bot-server | super API 核心 |
| `pnpm e2e:sign-alignment` | admin + bot-server | 签到 admin→bot 对齐 |
| `pnpm e2e:cloud` | admin + bot-server | admin 探针 bot |
| `pnpm e2e:admin-ui` | admin | 总控 UI |
| `pnpm e2e:inject` | gateway + bot-server | inject relay 路径 |

## 健康检查

```powershell
# Gateway
curl.exe http://127.0.0.1:8787/health

# Hook（须 POST）
curl.exe -s -X POST http://127.0.0.1:19088/api/get_profile_cache `
  -H "Content-Type: application/json" -d "{}"
```

## 模拟群消息回调

不依赖微信，直接向 Gateway 推送：

```powershell
curl.exe -X POST http://127.0.0.1:8787/api/recvMsg `
  -H "Content-Type: application/json" `
  -d "@d:\wechathook\scripts\test-payload.json"
```

`test-payload.json` 示例：

```json
{
  "fromUserName": { "String": "45220347292@chatroom" },
  "member_info": {
    "userName": "wxid_test",
    "nickName": "测试用户"
  },
  "msgType": "1",
  "newMsgId": "12345",
  "real_content": "#帮助"
}
```

期望：

- Gateway 日志：`Group message [xxx@chatroom] ...`
- 若 Hook 19088 在线 → 群收到回复
- 若 Hook 离线 → 日志有 `sendText failed`，但 webhook 仍返回 `{"code":1,"msg":"success"}`

## 分端点测试（兼容）

仍支持独立路径：

| 路径 | 用途 |
|------|------|
| `POST /api/recvMsg` | Hook 4.1.8.27 统一入口（推荐） |
| `POST /hook/group-message` | 仅群消息 |
| `POST /hook/member-join` | 仅进群 |
| `POST /hook/member-leave` | 仅退群 |

## 日志

| 前缀 | 来源 |
|------|------|
| `[gateway]` | HTTP 服务 |
| `[webhook]` | 回调处理 |
| `[bot-engine]` | 引擎、插件加载 |
| `[tcp-receiver]` | TCP 模式 |

开启 debug：

```powershell
$env:DEBUG="1"; pnpm start
```

## 常见问题

### 群内发指令无反应

| 检查项 | 处理 |
|--------|------|
| Gateway 是否运行 | `curl 8787/health` |
| Hook 是否在线 | `POST 19088/api/get_profile_cache` |
| inject 回调 URL | 须为 `http://127.0.0.1:8787/api/recvMsg` |
| JSON 写入成功 | inject 日志应有「JSON配置写入共享内存成功」 |
| `botWxid` | 须填机器人 wxid，且与 `member_info.userName` 格式一致 |
| `allowedRooms` | 若配置了列表，当前群 roomId 须在列表中 |
| 指令前缀 | 默认 `#`，如 `#帮助` 不是 `帮助` |

### Hook 返回 405

Hook 4.x 多数 API 仅支持 **POST**，不要用 GET。

### inject 后需重新登录

重新 inject 会启动新微信进程，需扫码登录后再测。

### sendText failed / fetch failed

Hook 19088 未启动或未登录。重新 inject 并登录。

### 插件改了没生效

```bash
pnpm --filter @wechathook/plugin-xxx build
# 重启 gateway
```

### better_sqlite3 报错

```bash
pnpm postinstall
```

### 指令冲突

启动日志 `[bot-engine] Command conflict: "xxx" registered by both ...`

两个插件注册了相同指令词，修改其中一个的 `commands`。

## 联调检查清单

```
[ ] pnpm build && pnpm start
[ ] 8787/health OK
[ ] inject-wechat.cmd（管理员）JSON 写入成功
[ ] 微信已登录
[ ] 19088 get_profile_cache 有 userInfo
[ ] config/bot.yaml botWxid 已填
[ ] 群内 #帮助 有回复
```

## TypeScript 检查

```bash
pnpm typecheck
```

## 获取群 roomId

```powershell
curl.exe -s -X POST http://127.0.0.1:19088/api/get_chatroom_list `
  -H "Content-Type: application/json" -d "{}" |
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{JSON.parse(d).data.slice(0,10).forEach(g=>console.log(g.nick_name,'|',g.username))})"
```

roomId 格式：`数字@chatroom`
