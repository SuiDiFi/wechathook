# 云中继架构：本地 Relay Client ↔ 云端 Bot Server

本文描述 wechathook 从「本地 Gateway + 插件」演进到「本地薄中继 + 云端应用层」的目标架构。协议字段对齐小微 V（`wechat-relay-client` 9.3.1）的 `chat_message` / `cmd_message`，便于兼容现有云端习惯，也可逐步替换为自建服务。

---

## 1. 目标形态

```
┌─────────────────────────────────────────────────────────────────┐
│                    云端 Bot Server（你的业务）                    │
│  Socket.IO / WS  │  PluginRegistry  │  SQLite/PG  │  管理后台   │
│  指令解析 #帮助   │  签到/盲盒/游戏   │  代理/群空间 │  REST API  │
└───────────────┬───────────────────────────────┬─────────────────┘
                │ chat_message（上行）            │ cmd_message（下行）
┌───────────────▼───────────────────────────────▼─────────────────┐
│              本地 Relay Client（Windows，薄客户端）                 │
│  可选 Electron/托盘  │  本地回调 HTTP  │  Hook 指令执行器          │
│  inject / 实例管理   │  :8787/recvMsg  │  callWechatAPI → 19088   │
└───────────────┬───────────────────────────────────────────────────┘
                │ POST /api/recvMsg          POST /api/*
┌───────────────▼───────────────────────────────────────────────────┐
│  Weixin.exe + libGLESv1.dll（Hook 4.1.8.27）                        │
└───────────────────────────────────────────────────────────────────┘
```

**原则**

| 层级 | 职责 | 不包含 |
|------|------|--------|
| 本地 Relay | Hook 运维、消息格式化、上下行中继、Hook API 执行 | 游戏逻辑、积分、插件 |
| 云端 Bot | 业务、插件、存储、权限、管理 UI | 微信进程、DLL inject |

---

## 2. 仓库目录拆分（目标）

当前 monorepo 在演进期可同时跑 **local** 与 **cloud** 两种模式；最终目录建议：

```
wechathook/
├── apps/
│   ├── gateway/              # 【现】本地 Bot 模式入口（阶段 A，保留至迁移完成）
│   ├── relay-client/         # 【新】本地云中继客户端（Node 先行，后可套 Electron 壳）
│   └── bot-server/           # 【新】云端 Bot 服务入口
├── packages/
│   ├── shared/               # 公共类型（扩展 Relay 协议类型）
│   ├── hook-adapter/         # 【本地】Hook 入站标准化 + 出站 API + inject 配置
│   ├── relay-protocol/       # 【新】chat_message / cmd_message 格式化、cmd 映射表
│   ├── bot-core/             # 【云端】引擎、插件注册、路由（从本地迁出或共用）
│   └── remote-hook-client/   # 【新】云端用的 IHookClient 实现 → 发 cmd_message 到 Relay
├── plugins/                  # 【云端部署】娱乐/管理插件（不再打进 Relay）
├── config/
│   ├── bot.yaml              # 云端 Bot 配置
│   └── relay.yaml            # 本地 Relay 配置（新建）
└── docs/development/
    └── cloud-relay-architecture.md   # 本文
```

### 模块迁移对照

| 现有模块 | 阶段 A（现在） | 阶段 C（云中继） |
|----------|----------------|------------------|
| `apps/gateway` | 本地 Bot + 插件 | 可选保留为「离线/开发模式」 |
| `packages/hook-adapter` | gateway 使用 | **relay-client** 使用 |
| `packages/bot-core` | gateway 内 | **bot-server** 使用 |
| `plugins/*` | 本地加载 | **云端**加载 |
| `IHookClient` | `Hook4xAdapter` 直连 19088 | 云端 `RemoteHookClient` → Socket cmd |

---

## 3. 通信协议（对齐小微 V）

传输层：**Socket.IO**（与小微 V 一致），连接地址形如：

```
wss://your-server.example.com?token={deviceToken}
```

鉴权：`token` = 设备密钥（小微 V 中 `savedKey` / `deviceId` 同源）。

---

### 3.1 上行：`chat_message`

**方向**：Relay Client → Bot Server  

**触发**：Hook POST 到本地 `http://127.0.0.1:{localPort}/api/recvMsg` 后，Relay 格式化并 emit。

**Emit 签名**（与小微 V `main.js` 一致）：

```javascript
socket.emit('chat_message', currentWxid, formattedMsg, (response) => { /* 可选 ack */ });
```

**`formattedMsg` 字段**（Hook 原始 JSON → 云端标准消息）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `currentWxid` | string | 当前机器人 wxid |
| `msgId` | string | `newMsgId` / `MsgId`，去重用 |
| `fromUserName` | string | 发送方（群则为 `xxx@chatroom`） |
| `toUserName` | string | 接收方 |
| `talkerId` | string | 群内实际发言人 wxid |
| `msgType` | number | 微信消息类型，文本一般为 `1` |
| `text` | string | 解析后的纯文本（群消息去掉 `wxid:\n` 前缀） |
| `timestamp` | number | Unix 秒 |
| `at_user_list` | string[] | @ 列表 |
| `members` | array \| null | 群成员变动时 `[{ remark: '群成员变动' }]` |
| `raw` | string | 原始 `msgSource` 或事件 JSON |

**群成员变动**：`event_type` 为 `1009`～`1012` 时，仍走 `chat_message`，`text` 为 `event_desc`，见小微 V `formatMemberChangeEvent`。

**Relay 侧过滤**（与小微 V 一致，建议在 `packages/relay-protocol` 实现）：

- 登录后 **15 秒**内不推送
- 过滤「自己发送」的消息
- `currentWxid + msgId` 去重，缓存上限约 1000

**Hook 原始 → formattedMsg**：可复用/移植 `hook-adapter` 的 `normalizeGroupMessage`，输出字段映射到上表。

---

### 3.2 下行：`cmd_message`

**方向**：Bot Server → Relay Client  

**监听**：

```javascript
socket.on('cmd_message', async (data, ack) => {
  const result = await executeHookCommand(data);
  if (typeof ack === 'function') ack(result);
});
```

**请求体 `data`**：

```typescript
interface CmdMessage {
  wxid: string;       // 目标机器人 wxid，对应 wechatInstances
  cmd: string;        // 指令名，见下表
  data: Record<string, unknown>;  // cmd 参数
}
```

**响应体**（ack 回调，统一格式）：

```typescript
interface CmdResponse {
  code: number;   // 0 成功，非 0 失败
  msg: string;
  data: unknown | null;
}
```

**`cmd` → Hook API 映射**（与小微 V `handleServerCommand` 一致）：

| cmd | Hook action | data 主要字段 |
|-----|-------------|----------------|
| `SendText` | `send_text_msg` 或 `send_at_text` | `{ wxid, msg }` 或 `{ wxids, msg, roomId }` |
| `SendImage` | `send_image_msg` | `{ wxid, data: filepath \| url }` |
| `SendVoice` | `send_voice` | `{ toWxid, silkPath }` |
| `SendEmotion` | `send_fav_emotion` | `{ wxid, md5, length }` |
| `SendXml` | `send_app_msg` | `{ wxid, content, type? }` |
| `GetProfile` | `get_profile_new` / `get_profile_cache` | `{}` |
| `GetContact` | `get_contact` | `{ wxid }` |
| `GetChatroomInfo` | `init_rooms` + `get_rooms_info` | `{}` |
| `GetRoomMembers` | `init_rooms` + `get_room_members` | `{ room_id }` |
| `DelMemberFromChatroom` | `del_member_from_chat_room` | `{ room_id, wxid_list }` |
| `AddMemberToChatRoom` | `add_member_to_chat_room` | `{ room_id, wxid_list }` |
| `EnterRoom` | `get_a8key` + `enter_room` | `{ url, ... }` |
| `DropGroup` | `quit_and_del_chat_room` | `{ roomId }` |
| `Ping` | — | 返回 `{ timestamp }` |

云端 `RemoteHookClient` 示例：

```typescript
// packages/remote-hook-client — 插件侧用法不变
async sendText(roomId: string, msg: string) {
  await this.socket.emitWithAck('cmd_message', {
    wxid: this.botWxid,
    cmd: 'SendText',
    data: { wxid: roomId, msg },
  });
}
```

---

### 3.3 云端 HTTP API（可选，对齐小微 V 设备管理）

若需要设备绑定/版本检查，可一并实现：

| 路径 | 用途 |
|------|------|
| `POST /open/bot/device_license/bind` | `{ code, deviceId }` 绑定 |
| `POST /open/bot/device_license/checkStatus` | `{ wxid, deviceId }` |
| `POST /open/bot/client_version/checkLatestVersion` | `{ protocolVersion: "V1" }` |

业务插件、群空间、代理体系在此之上扩展，**不必放进 Relay 安装包**。

---

## 4. 本地 Relay Client 配置草案

`config/relay.yaml`：

```yaml
wechat:
  path: "C:\\Program Files\\Tencent\\weixin\\Weixin.exe"
  requiredVersion: "4.1.8.27"

hook:
  dllPath: "D:\\HOOK\\HOOK 4.1.8.27\\4.1.8.27\\libGLESv1.dll"
  injectExe: "D:\\HOOK\\HOOK 4.1.8.27\\4.1.8.27\\x64 inject.exe"
  httpServerPort: 19088
  localCallbackPort: 8787
  callbackPath: "/api/recvMsg"
  # inject JSON 字段，与 hook-adapter buildHook41827InjectConfig 一致

relay:
  socketUrl: "wss://your-server.example.com"   # token 运行时拼接
  deviceToken: ""                              # 或从环境变量读取
  loginCooldownSec: 15
  pushDedupeMax: 1000

mode: "relay"   # relay | local（local 走现有 gateway，便于开发）
```

---

## 5. 云端 Bot Server 配置草案

`config/bot.yaml`（现有文件扩展）：

```yaml
server:
  port: 9000
  socketPath: "/socket.io"

bot:
  commandPrefix: "#"
  botWxid: ""          # 可由 Relay 登录事件动态注册多实例
  ownerWxids: []
  adminWxids: []
  allowedRooms: []

plugins:
  globalEnabled: [help, welcome, checkin, admin, game-stub]
  dir: plugins

storage:
  dbPath: data/bot.db
```

多机器人时：云端维护 `wxid → deviceToken → socketId` 路由表，按 `chat_message` 的 `currentWxid` 选实例。

---

## 6. 数据流（与现 wechathook 对比）

### 现模式（local）

```
Hook → POST /api/recvMsg → gateway → normalize → PluginRegistry → Hook4xAdapter → Hook
```

### 目标模式（cloud）

```
Hook → POST /api/recvMsg → relay-client → formatWechatMessage → chat_message → bot-server
                                                                              → plugins
bot-server → RemoteHookClient → cmd_message → relay-client → Hook4xAdapter → Hook
```

**云端 `NormalizedMessage`**：在 bot-server 收到 `formattedMsg` 后做一次转换，与现有插件接口兼容：

| formattedMsg | NormalizedMessage |
|--------------|-------------------|
| `fromUserName`（含 @chatroom） | `roomId` |
| `talkerId` | `senderWxid` |
| `text` | `content` |
| `msgId` | `eventId` |
| `msgType` | `msgType` |

这样 **现有 `plugins/*` 改动最小**，仅 `PluginContext.hook` 从直连改为 `RemoteHookClient`。

---

## 7. 分阶段实施路线

> **案例对照：** 小微 V = 路径 A（薄中继）；萌兔 **1.1.4 最新版** = 路径 B（本地 REST 能力层 + 云端后台）；萌兔历史 0.6.6 ≈ 路径 A。详见 [萌兔 MTRobot 案例分析](./mtrobot-case-study.md)。

### 阶段 A — 现在（已完成）

- 本地 `apps/gateway` + `plugins/` 验证 Hook 与玩法原型
- **继续在此阶段迭代插件**，不必等 Relay

### 阶段 B — 协议包 + 双模式开关

1. 新增 `packages/relay-protocol`：`formatChatMessage`、`executeCmdMessage`
2. `hook-adapter` 导出格式化函数，与小微 V 字段对齐
3. gateway 增加 `mode: local | relay`：relay 时只转发 `chat_message`，不跑插件

### 阶段 C — 云端 Bot Server

1. 新增 `apps/bot-server`：Socket.IO 服务 + 迁入 `bot-core` + `plugins/`
2. 新增 `packages/remote-hook-client` 实现 `IHookClient`
3. 部署到云服务器，Relay 用 `deviceToken` 连接

### 阶段 D — 本地 Relay Client 产品化

1. 新增 `apps/relay-client`（Node 版，逻辑等同小微 V `main.js` 子集）
2. 可选：Electron/Tauri 壳（登录、实例列表、防更新、日志窗）
3. `apps/gateway` 标记为 `dev-only` 或合并进 relay 的 `mode: local`

---

## 8. 本地 Relay 最小文件清单（阶段 D 参考）

对标小微 V 安装目录，**不含任何插件**：

```
relay-client/
├── 小V助手.exe          # 可选，后期 Electron
├── resources/
│   ├── app.asar         # relay-client 逻辑
│   ├── libGLESv1.dll    # Hook 4.1.8.27
│   └── x64 inject.exe
├── config.yaml
└── logs/
```

---

## 9. 开发模式建议

| 场景 | 用法 |
|------|------|
| 写插件、调指令 | `mode: local`，`pnpm start`，无云依赖 |
| 联调 Relay 协议 | 本地起 `bot-server` + `relay-client`，均 localhost |
| 生产 | 云 `bot-server` + 各 Windows 机器 `relay-client` |

---

## 10. 相关文档

- [架构概览](./architecture.md) — 当前本地 Gateway 架构
- [Hook 对接](./hook-integration.md) — inject 与 19088 API
- 小微 V 参考：`D:\小微V机器人\xiaowei\小V助手-技术分析报告.md`

---

**文档版本**：0.1（规划稿，未实现 `apps/relay-client` / `apps/bot-server`）
