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

**sign 字段映射：**

| form 字段 | SignGroupConfig |
|-----------|-----------------|
| `switch_checked` | `enabled` |
| `sign_content` | `keyword` |
| `message` | `messageTemplate` |
| `min_jb` / `max_jb` | `minCoins` / `maxCoins` |
| `min_jf` / `max_jf` | `minDiamonds` / `maxDiamonds` |

**实现：** `packages/plugin-config/src/sign-mapper.ts`

---

## 3. 运行时生效

**引擎：** `SignEngine.tryHandle`（`packages/bot-core/src/super/sign-engine.ts`）

- 当 `resolveSignConfig(roomId).enabled === true` 时，**完全采用萌兔配置**，yaml `sign` 不覆盖 keyword/template。
- 当萌兔 op 未启用时，回退 `config/groups/{roomId}.yaml` 的 `sign` 段。

---

## 4. 调试端点

```
GET /super/debug/sign?roomId={roomId}
```

响应示例：

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

---

## 5. 验收

```powershell
pnpm start:server
pnpm start:admin
pnpm e2e:sign-alignment
```

**通过标准：**

1. admin `srcPost` 改关键词 → `srcGet` 读回一致  
2. bot `debug/sign` keyword 一致  
3. callback 发新关键词 → 回复含预期模板标记  
4. 旧萌兔关键词不触发萌兔模板（`#签到` 插件路径除外）
