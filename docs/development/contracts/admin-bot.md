# 契约：Admin → Bot-Server（配置面 → 引擎）

## 1. Admin 写入

### POST `/api/Agent/srcPost`

**请求体（二选一，实现须兼容）：**

```json
{ "op": "sign", "form": { "switch_checked": 1, "sign_content": "打卡", "message": "..." } }
```

```json
{ "op": "sign", "data": "{\"switch_checked\":1,\"sign_content\":\"打卡\"}" }
```

**行为：**

- 将 `form` 或解析后的 `data` 扁平 JSON 写入  
  `data/agent-overrides/{op}.json`
- 成功响应：`{ "status": 1, "message": "成功", "data": null }`

**实现：** `apps/admin/src/mengtu-api.ts`

---

### POST `/api/Agent/srcGet`

**请求：** `{ "op": "sign" }`

**行为：**

- 读取 `reference/.../Agent/srcGet/{op}.json` 作为 form 基线  
- merge `data/agent-overrides/{op}.json` 到各 field 的 `value`  
- 响应：`{ "status": 1, "data": { "form": [...] } }`

---

## 2. Bot-Server 读取

**类：** `PluginConfigLoader`（`packages/plugin-config`）

| 方法 | 说明 |
|------|------|
| `loadAgentOp(op)` | 归档 + agent-overrides |
| `loadGroupOverride(roomId, op)` | 群覆盖 + agent 基线 |
| `resolveOp(roomId, op)` | 群 > 总代 |
| `resolveSignConfig(roomId)` | sign form → `SignGroupConfig` |
| `resolveMenuText(roomId)` | menu form → 菜单文本（`[换行]` → `\n`） |
| `describeMenu(roomId)` | menu 生效摘要（调试） |

**sign 字段映射：**

| form 字段 | SignGroupConfig |
|-----------|-----------------|
| `switch_checked` | `enabled` |
| `sign_content` | `keyword` |
| `message` | `messageTemplate` |
| `min_jb` / `max_jb` | `minCoins` / `maxCoins` |
| `min_jf` / `max_jf` | `minDiamonds` / `maxDiamonds` |

**实现：** `packages/plugin-config/src/sign-mapper.ts`

**menu 字段映射：**

| form 字段 | 运行时 |
|-----------|--------|
| `switch_checked` | `enabled` |
| `message` | 菜单正文（`[换行]` 转为换行） |
| `type` | 仅展示，不参与引擎 |

**实现：** `packages/plugin-config/src/loader.ts` → `resolveMenuText`

---

## 3. 运行时生效

### sign

**引擎：** `SignEngine.tryHandle`（`packages/bot-core/src/super/sign-engine.ts`）

- 当 `resolveSignConfig(roomId).enabled === true` 时，**完全采用萌兔配置**，yaml `sign` 不覆盖 keyword/template。
- 当萌兔 op 未启用时，回退 `config/groups/{roomId}.yaml` 的 `sign` 段。

### menu

**引擎：** `MenuEngine.tryHandle`（`packages/bot-core/src/super/menu-engine.ts`）

- 群消息文本为 `菜单` / `功能` / `功能菜单` 时触发。
- 当 `resolveOp(roomId, "menu").enabled === true` 且 `message` 非空时，回复自定义菜单文本。
- 未启用或无自定义内容时，使用内置 `FALLBACK_MENU`。

---

## 4. 调试端点

```
GET /super/debug/sign?roomId={roomId}
GET /super/debug/menu?roomId={roomId}
```

**sign 响应示例：**

```json
{
  "status": 1,
  "msg": "suc",
  "data": {
    "roomId": "57226609398@chatroom",
    "agentOverride": true,
    "groupOverride": false,
    "enabled": true,
    "keyword": "打卡",
    "messagePreview": "..."
  }
}
```

**menu 响应示例：**

```json
{
  "status": 1,
  "msg": "suc",
  "data": {
    "roomId": "57226609398@chatroom",
    "agentOverride": true,
    "groupOverride": false,
    "enabled": true,
    "messagePreview": "【E2E菜单对齐】测试功能A...",
    "menuTextPreview": "【E2E菜单对齐】测试功能A..."
  }
}
```

---

## 5. 验收

```powershell
pnpm start:server
pnpm start:admin
pnpm e2e:sign-alignment
pnpm e2e:menu-alignment
```

**sign 通过标准：**

1. admin `srcPost` 改关键词 → `srcGet` 读回一致  
2. bot `debug/sign` keyword 一致  
3. callback 发新关键词 → 回复含预期模板标记  
4. 旧萌兔关键词不触发萌兔模板（`#签到` 插件路径除外）

**menu 通过标准：**

1. admin `srcPost` 改 `message` → `srcGet` 读回一致  
2. bot `debug/menu` 的 `menuTextPreview` 含标记  
3. callback 发 `菜单` / `功能` → 回复含自定义菜单行  
4. E2E 结束后恢复原有 `data/agent-overrides/menu.json`（若存在）
