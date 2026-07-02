# 存储 API

持久化由 `SqliteStorage` 实现（`packages/bot-core/src/storage.ts`），数据库默认路径 `data/bot.db`。

## 数据表

### users

| 列 | 类型 | 说明 |
|----|------|------|
| wxid | TEXT PK | 用户 wxid |
| nick | TEXT | 昵称 |
| points | INTEGER | 积分 |
| updated_at | TEXT | 更新时间 |

### checkins

| 列 | 类型 | 说明 |
|----|------|------|
| id | INTEGER PK | 自增 |
| room_id | TEXT | 群 id |
| wxid | TEXT | 用户 wxid |
| checkin_date | TEXT | 日期 YYYY-MM-DD |
| streak | INTEGER | 连续签到天数 |
| created_at | TEXT | 创建时间 |

唯一约束：`(room_id, wxid, checkin_date)`

### plugin_config

| 列 | 类型 | 说明 |
|----|------|------|
| room_id | TEXT | 群 id |
| plugin_name | TEXT | 插件 id |
| config_json | TEXT | JSON 字符串 |
| updated_at | TEXT | 更新时间 |

主键：`(room_id, plugin_name)`

### game_sessions

| 列 | 类型 | 说明 |
|----|------|------|
| room_id | TEXT | 群 id |
| plugin_id | TEXT | 插件 id |
| state | TEXT | 状态名（如 playing、waiting） |
| data_json | TEXT | 状态数据 JSON |
| started_at | TEXT | 开始时间 |

主键：`(room_id, plugin_id)`

## IStorage 方法

### 用户与积分

```typescript
// 创建或更新用户昵称
storage.upsertUser(wxid: string, nick: string): void;

// 查询用户
storage.getUser(wxid: string): UserRecord | undefined;

// 增减积分，返回新总分
storage.addPoints(wxid: string, points: number): number;

storage.getPoints(wxid: string): number;
```

### 签到

```typescript
// 执行签到；success=false 表示今日已签
storage.checkin(roomId: string, wxid: string): {
  success: boolean;
  streak: number;
  totalPoints: number;
};

storage.hasCheckedInToday(roomId: string, wxid: string): boolean;

// 积分排行（当前全局 users 表，limit 默认 10）
storage.getLeaderboard(roomId: string, limit?: number): LeaderboardEntry[];
```

签到积分规则（当前实现）：

- 基础 10 分
- 连续签到每天额外 +2，上限 +12（即最多 22 分/天）

### 插件配置

```typescript
storage.getPluginConfig(roomId, pluginName): Record<string, unknown> | undefined;
storage.setPluginConfig(roomId, pluginName, config): void;
```

示例 — 拆盲盒概率配置：

```typescript
ctx.storage.setPluginConfig(msg.roomId, "blind-box", {
  prices: [10, 50, 100],
  rewards: [
    { name: "谢谢参与", weight: 70 },
    { name: "10积分", weight: 25 },
    { name: "大奖", weight: 5 },
  ],
});
```

### 游戏会话

```typescript
storage.getGameSession(roomId, pluginId): GameSession | undefined;

storage.setGameSession(roomId, pluginId, session: GameSession | null): void;
```

`session` 为 `null` 时删除记录。

```typescript
interface GameSession {
  pluginId: string;
  roomId: string;
  state: string;              // 自定义状态机状态
  data: Record<string, unknown>;
  startedAt: string;          // ISO 8601
}
```

## 插件中使用

通过 `PluginContext.storage` 访问，**不要**在插件中直接操作 SQLite 文件。

```typescript
async onMessage(msg, ctx) {
  ctx.storage.upsertUser(msg.senderWxid, msg.senderNick);
  const points = ctx.storage.getPoints(msg.senderWxid);
  // ...
}
```

## 扩展存储

若需新表或字段：

1. 在 `storage.ts` → `initSchema()` 添加 DDL
2. 在 `IStorage`（`packages/shared/src/types.ts`）添加方法
3. 在 `SqliteStorage` 实现
4. 更新本文档

建议保持 `IStorage` 为插件唯一数据入口，便于后续换库或加缓存层。

## 备份

数据库文件：`data/bot.db`（WAL 模式可能产生 `bot.db-wal`、`bot.db-shm`）

备份时停止 gateway 后复制整个 `data/` 目录。
