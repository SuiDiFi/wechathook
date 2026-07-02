# 快速上手

## 环境要求

- Node.js **20+**
- pnpm（`npm install -g pnpm`）
- Windows + 微信 **4.1.8.27** + Hook 4.1.8.27
- 构建 native 模块需 VS Build Tools（better-sqlite3）

## 安装与构建

```bash
cd d:\wechathook
pnpm install
pnpm build
```

若启动报 `better_sqlite3.node` 缺失：

```bash
pnpm postinstall
```

## 配置

编辑 [`config/bot.yaml`](../../config/bot.yaml)：

```yaml
hook:
  baseUrl: "http://127.0.0.1:19088"

bot:
  commandPrefix: "#"
  botWxid: "你的wxid"          # 必填，防死循环
  ownerWxids: ["你的wxid"]     # 管理员
  allowedRooms: []            # 空=全部群；或填 roomId 列表
  port: 8787
```

获取 wxid（需 Hook 已登录）：

```powershell
curl.exe -s -X POST http://127.0.0.1:19088/api/get_profile_cache `
  -H "Content-Type: application/json" -d "{}"
```

从返回的 `userInfo.userName.String` 读取。

## 启动 Gateway

```bash
pnpm dev    # 开发（tsx watch）
pnpm start  # 生产（编译后 node）
```

成功日志示例：

```
[gateway] Webhook gateway listening on http://127.0.0.1:8787
[gateway]   POST /api/recvMsg       (Hook 4.1.8.27 统一回调)
```

## 注入 Hook

**先启动 gateway，再 inject。**

以管理员运行：

```bash
scripts\inject-wechat.cmd
```

或见 [Hook 对接](./hook-integration.md)。

## 验证联调

| 步骤 | 命令/操作 | 期望 |
|------|-----------|------|
| Gateway | `curl http://127.0.0.1:8787/health` | `{"ok":true}` |
| Hook | `POST 19088/api/get_profile_cache` | 返回用户信息 |
| 模拟回调 | 见 [测试与调试](./testing.md) | gateway 有日志 |
| 群内测试 | 发送 `#帮助` | 机器人回复指令列表 |

## 开发工作流

```bash
# 1. 改代码
# 2. 重新编译
pnpm build

# 3. 重启 gateway（改 config 也需重启）
pnpm start

# 4. 新增/改插件后
pnpm --filter @wechathook/plugin-xxx build
# 然后重启 gateway
```

## Monorepo 包说明

| 包名 | 路径 | 说明 |
|------|------|------|
| `@wechathook/shared` | `packages/shared` | 类型定义 |
| `@wechathook/hook-adapter` | `packages/hook-adapter` | Hook 适配 |
| `@wechathook/bot-core` | `packages/bot-core` | 核心引擎 |
| `@wechathook/gateway` | `apps/gateway` | 入口 |
| `@wechathook/plugin-*` | `plugins/*` | 各插件 |

## 常用脚本

| 脚本 | 用途 |
|------|------|
| `scripts/inject-wechat.cmd` | Hook 注入（管理员） |
| `scripts/test-payload.json` | 模拟群消息回调 |
| `scripts/ensure-native-deps.js` | postinstall 编译 sqlite |

## 下一步

- 编写插件 → [插件开发](./plugin-development.md)
- 了解配置项 → [配置参考](./configuration.md)
