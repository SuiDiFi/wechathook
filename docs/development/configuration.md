# 配置参考

配置文件主入口：[`config/bot.yaml`](../../config/bot.yaml)

## hook 段

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `baseUrl` | string | `http://127.0.0.1:19088` | Hook HTTP API 根地址 |
| `receiveMode` | `http` \| `tcp` | `http` | 消息接收模式 |
| `callbackPath` | string | `/api/recvMsg` | HTTP 回调路径 |
| `tcpHost` | string | `0.0.0.0` | TCP 监听地址 |
| `tcpPort` | number | `61108` | TCP 监听端口 |
| `httpServerPort` | number | `19088` | Hook 内置 API 端口（inject 用） |
| `webhookSecret` | string | `""` | 回调鉴权；非空时请求需带 `x-webhook-secret` 头 |

### receiveMode 说明

- **http**：Hook 主动 POST 到 `http://127.0.0.1:{bot.port}{callbackPath}`
- **tcp**：Gateway 监听 `tcpPort`，协议为 4 字节大端长度 + UTF-8 JSON

## bot 段

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `commandPrefix` | string | `#` | 指令前缀 |
| `ownerWxids` | string[] | `[]` | 全局 Owner，拥有管理权限 |
| `adminWxids` | string[] | `[]` | 全局管理员 |
| `botWxid` | string | — | 机器人自身 wxid，匹配则忽略消息 |
| `allowedRooms` | string[] | `[]` | 允许处理的群；**空数组=全部群** |
| `port` | number | `8787` | Gateway 监听端口 |

## plugins 段

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `globalEnabled` | string[] | — | 全局启用的插件 id 列表 |
| `dir` | string | `plugins` | 插件目录（相对项目根） |

插件 id 须与 `plugins/<name>/plugin.json` 中的 `id` 一致。

## storage 段

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `dbPath` | string | `data/bot.db` | SQLite 文件路径 |

## groups 段（内联）

也可在 `config/bot.yaml` 的 `groups` 下内联配置，但更推荐独立文件。

## 按群配置

路径：`config/groups/<roomId>.yaml`

示例（`config/groups/25241996649@chatroom.yaml`）：

```yaml
enabledPlugins:
  - help
  - welcome
  - checkin

welcomeMessage: "欢迎 {nick} 加入！发送 {prefix}帮助 查看指令。"
```

| 字段 | 说明 |
|------|------|
| `enabledPlugins` | 覆盖全局列表，仅这些插件在该群生效 |
| `welcomeMessage` | welcome 插件欢迎语模板 |

### 欢迎语占位符

| 占位符 | 替换为 |
|--------|--------|
| `{nick}` | 新成员昵称 |
| `{wxid}` | 新成员 wxid |
| `{prefix}` | 指令前缀（如 `#`） |

## 配置加载逻辑

实现见 `packages/bot-core/src/config.ts`：

1. 读取 `config/bot.yaml`
2. 扫描 `config/groups/*.yaml`，文件名（去掉扩展名）作为 `roomId`
3. 合并 `bot.yaml` 内联 `groups` 与文件配置

## 修改配置后

**必须重启 gateway** 才能生效：

```bash
pnpm start
```

Hook inject 的 `http_callback_url` 依赖 `bot.port` 与 `callbackPath`，若改端口需重新 inject。

## 环境变量

| 变量 | 说明 |
|------|------|
| `CONFIG_PATH` | 自定义配置文件路径（默认 `config/bot.yaml`） |
| `DEBUG` | 非空时输出 debug 日志 |
