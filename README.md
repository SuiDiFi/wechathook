# 微信群娱乐管理机器人

Hook 适配层 + 插件化应用层，对接个人微信 Hook 4.x API。

## 架构

```
Hook 4.x ──回调──▶ Gateway (8787) ──▶ PluginRegistry ──▶ 插件
         ◀──API─── Hook4xAdapter ◀──────────────────────────┘
                              │
                           SQLite
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
pnpm build
```

> 首次安装若 `better-sqlite3` 原生模块未编译，可运行 `pnpm postinstall` 或见 [`scripts/ensure-native-deps.js`](scripts/ensure-native-deps.js)。

### 2. 配置

编辑 [`config/bot.yaml`](config/bot.yaml)：

| 配置项 | 说明 |
|--------|------|
| `hook.baseUrl` | 你的 Hook 4.x 服务地址 |
| `hook.webhookSecret` | 回调鉴权密钥（Hook 推送时需带 `x-webhook-secret` 头） |
| `bot.botWxid` | 机器人自身 wxid（避免处理自己发出的消息） |
| `bot.allowedRooms` | 允许处理的群 ID 列表，空数组=全部群 |
| `bot.ownerWxids` / `adminWxids` | 全局管理员 |

按群配置示例：复制 `config/groups/example_chatroom.yaml.example` 为 `config/groups/<roomId>.yaml`

### 3. 构建

```bash
pnpm build
```

### 4. 启动

```bash
pnpm dev    # 开发模式（热重载）
pnpm start  # 生产模式
```

### 5. 配置 Hook 回调

在 Hook 服务侧将以下地址设为推送目标（需公网可达，本地开发可用 ngrok/frp）：

| 事件 | 地址 |
|------|------|
| 群聊消息 | `POST http://你的服务器:8787/hook/group-message` |
| 成员进群 | `POST http://你的服务器:8787/hook/member-join` |
| 成员退群 | `POST http://your-server:8787/hook/member-leave` |

请求头（若配置了 webhookSecret）：

```
x-webhook-secret: change-me-to-a-random-secret
```

## 内置插件

| 插件 | 指令 | 说明 |
|------|------|------|
| help | `#帮助` | 显示指令列表 |
| welcome | — | 新人进群自动欢迎 |
| checkin | `#签到` `#排行榜` | 签到赚积分 |
| admin | `#踢 <wxid>` | 踢人（管理员） |
| game-stub | `#开始游戏` `#结束` | 猜数字游戏骨架 |

## 开发新插件

1. 在 `plugins/` 下新建目录，包含：
   - `plugin.json` — manifest
   - `src/index.ts` — 实现 `BotPlugin` 接口
   - `package.json` + `tsconfig.json`
2. 在 `config/bot.yaml` 的 `plugins.globalEnabled` 中添加插件 id
3. 重新 `pnpm build` 并重启 gateway

插件接口：

```typescript
interface BotPlugin {
  meta: { id: string; name: string; version: string; commands?: string[] };
  onLoad?(ctx: PluginContext): void;
  onMessage?(msg: NormalizedMessage, ctx: PluginContext): Promise<boolean>;
  onMemberJoin?(event: MemberJoinEvent, ctx: PluginContext): Promise<void>;
}
```

## Hook 4.1.8.27 对接

本项目已适配 `D:\HOOK\HOOK 4.1.8.27\4.1.8.27` 框架，详见 [`docs/hook-4.1.8.27.md`](docs/hook-4.1.8.27.md)。

- **出站 API**：`http://127.0.0.1:19088/api/*`（发送消息等）
- **入站回调**：`POST http://127.0.0.1:8787/api/recvMsg`（与 VXHook demo 一致）
- inject 配置中 `http_callback_url` 指向 gateway 的 `/api/recvMsg`

## 开发文档

完整开发者文档见 [`docs/development/`](docs/development/README.md)：

- [架构概览](docs/development/architecture.md)
- [插件开发](docs/development/plugin-development.md)
- [配置参考](docs/development/configuration.md)
- [测试与调试](docs/development/testing.md)

## 验证

1. `curl http://127.0.0.1:8787/health` → `{"ok":true}`
2. 群内发送 `#帮助` → 返回指令列表
3. 发送 `#签到` → 写入 SQLite 并回复积分
4. 新人进群 → 触发 welcome 欢迎语

## 风险提示

个人微信 Hook 存在封号/掉线风险，请谨慎使用。发朋友圈等高危接口未封装。

## 项目结构

```
packages/shared/       类型定义
packages/hook-adapter/ Hook 4.x 适配器
packages/bot-core/     核心引擎、存储、插件注册
plugins/               热插拔插件
apps/gateway/          启动入口
config/                配置文件
data/                  SQLite 数据库
```
