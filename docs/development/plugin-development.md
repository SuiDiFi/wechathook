# 插件开发

插件是 wechathook 的核心扩展单元。每个玩法（签到、拆盲盒、砸金蛋等）独立一个目录，重启 Gateway 后加载。

## 目录结构

```
plugins/my-game/
├── plugin.json       # manifest（必填）
├── package.json      # workspace 包
├── tsconfig.json
└── src/
    └── index.ts      # 编译到 dist/index.js
```

## plugin.json

```json
{
  "id": "my-game",
  "name": "我的游戏",
  "version": "0.1.0",
  "description": "玩法说明",
  "enabled": true,
  "commands": ["开始游戏", "结束"],
  "main": "dist/index.js"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 唯一标识，与 `globalEnabled` 对应 |
| `name` | 是 | 显示名称 |
| `version` | 是 | 语义化版本 |
| `enabled` | 否 | `false` 则跳过加载 |
| `commands` | 否 | 注册的指令词（不含前缀） |
| `main` | 否 | 入口文件，默认 `index.js` |

## BotPlugin 接口

```typescript
import type {
  BotPlugin,
  NormalizedMessage,
  MemberJoinEvent,
  PluginContext,
} from "@wechathook/shared";

const plugin: BotPlugin = {
  meta: {
    id: "my-game",
    name: "我的游戏",
    version: "0.1.0",
    commands: ["开始游戏", "结束"],
  },

  onLoad(ctx: PluginContext) {
    ctx.logger.info("my-game loaded");
  },

  async onMessage(msg: NormalizedMessage, ctx: PluginContext): Promise<boolean> {
    const prefix = ctx.config.bot.commandPrefix;
    if (msg.content.trim() === `${prefix}开始游戏`) {
      await ctx.hook.sendText(msg.roomId, "游戏开始！");
      return true; // 已处理，阻止后续插件
    }
    return false;
  },

  async onMemberJoin(event: MemberJoinEvent, ctx: PluginContext) {
    // 可选：进群事件
  },
};

export default plugin;
```

### 生命周期

| 钩子 | 时机 | 返回值 |
|------|------|--------|
| `onLoad` | 插件加载后 | void |
| `onMessage` | 收到群文本消息 | `true`=已处理并停止传播 |
| `onMemberJoin` | 成员进群 | void |
| `onMemberLeave` | 成员退群 | void |

## PluginContext

```typescript
interface PluginContext {
  hook: IHookClient;           // 发消息、踢人等
  config: BotConfig;           // 全局配置
  storage: IStorage;           // SQLite 存储
  logger: Logger;
  isAdmin(roomId, wxid): boolean;
  isPluginEnabled(roomId, pluginId): boolean;
  getEnabledPlugins(roomId): string[];
}
```

### 发消息

```typescript
// 纯文本
await ctx.hook.sendText(msg.roomId, "你好");

// @某人（wxids 可为 notify@all 表示全体）
await ctx.hook.sendAt(msg.roomId, msg.senderWxid, `@${msg.senderNick} 你好`);
```

发送失败由 `SafeHookClient` 捕获并记日志，不会抛到 webhook。

### 权限检查

```typescript
if (!ctx.isAdmin(msg.roomId, msg.senderWxid)) {
  await ctx.hook.sendText(msg.roomId, "无权限");
  return true;
}
```

`isAdmin` 检查 `ownerWxids` 与 `adminWxids`。

## 指令路由

用户发送 `#签到` 时：

1. `PluginRegistry` 解析指令词 `签到`
2. 查 `commandMap` 找到对应插件 id
3. 仅当插件在该群 enabled 时调用其 `onMessage`

**指令词注册**：在 `meta.commands` 或 `plugin.json.commands` 中声明，避免多插件冲突（冲突会 warn 日志）。

## 状态机游戏模板

参考 [`plugins/game-stub`](../../plugins/game-stub/src/index.ts)：

```typescript
// 开始游戏 — 写入 session
ctx.storage.setGameSession(msg.roomId, "my-game", {
  pluginId: "my-game",
  roomId: msg.roomId,
  state: "playing",
  data: { target: 42, guesses: 0 },
  startedAt: new Date().toISOString(),
});

// 读取 session
const session = ctx.storage.getGameSession(msg.roomId, "my-game");

// 结束 — 清除 session
ctx.storage.setGameSession(msg.roomId, "my-game", null);
```

适用于：拆盲盒、砸金蛋、猜数字、抽奖等有状态的玩法。

## 注册新插件

1. 复制 `plugins/game-stub/` 为模板
2. 修改 `plugin.json` 的 `id`、`commands`
3. 实现 `src/index.ts`
4. 在 `pnpm-workspace.yaml` 已包含 `plugins/*`，无需额外注册
5. 在 `config/bot.yaml` → `plugins.globalEnabled` 添加插件 id
6. 构建并重启：

```bash
pnpm --filter @wechathook/plugin-my-game build
pnpm start
```

## 按群启用

`config/groups/<roomId>.yaml`：

```yaml
enabledPlugins:
  - help
  - my-game
```

仅列出的插件在该群生效，覆盖 `globalEnabled`。

## 内置插件参考

| 插件 | 文件 | 要点 |
|------|------|------|
| help | `plugins/help/` | 指令列表 |
| welcome | `plugins/welcome/` | `onMemberJoin` + 模板 |
| checkin | `plugins/checkin/` | 签到 + 积分 + 排行榜 |
| admin | `plugins/admin/` | 权限 + kickMember |
| game-stub | `plugins/game-stub/` | 状态机 + 非指令消息处理 |

## 最佳实践

1. **指令精确匹配**：用 `msg.content.trim() === \`${prefix}xxx\`` 避免误触发
2. **onMessage 返回 true**：处理完务必返回，防止多插件重复响应
3. **upsertUser**：涉及积分前调用 `ctx.storage.upsertUser(wxid, nick)`
4. **不依赖 raw**：优先用 `NormalizedMessage`；高级场景可读 `msg.raw`
5. **单插件单职责**：拆盲盒、砸金蛋各一个插件，共用 `game_sessions` 表
6. **配置外置**：复杂概率/奖品放 `plugin_config` 或独立 yaml

## 后续玩法扩展清单

| 玩法 | 建议插件 id | 关键能力 |
|------|-------------|----------|
| 拆盲盒 | `blind-box` | game_sessions + 概率配置 |
| 砸金蛋 | `golden-egg` | game_sessions + 次数限制 |
| 抽奖 | `lottery` | 定时开奖 + 参与名单 |
| AI 陪聊 | `ai-chat` | ILLMProvider（待实现） |
