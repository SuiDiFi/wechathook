# 跨层接口契约

> 多 Agent 并行开发的**汇总锚点**：各窗口只改自己边界内的实现，**不得破坏本文档定义的契约**。  
> 变更契约须走 **G-Integration** 窗口，并更新对应 `e2e` / `contracts` 脚本。

---

## 契约索引

| 文档 | 边界 | 验证方式 |
|------|------|----------|
| [admin-bot.md](./admin-bot.md) | admin `srcPost` → 文件 → bot-server | `pnpm e2e:sign-alignment` · `pnpm e2e:menu-alignment` |
| [super-api.md](./super-api.md) | inject/relay → bot-server `/super/*` | `pnpm e2e:mvp` |
| [config-priority.md](./config-priority.md) | 配置合并优先级 | `pnpm contracts` 静态检查 |
| [handoff-template.md](./handoff-template.md) | 窗口交卷格式 | 人工 / 集成会话 |

---

## 共享路径（代码与文档必须一致）

| 路径 | 写入方 | 读取方 |
|------|--------|--------|
| `data/agent-overrides/{op}.json` | admin `POST /api/Agent/srcPost` | `PluginConfigLoader.loadAgentOp` |
| `data/group-overrides/{roomId}/{op}.json` | admin（待实现群级 UI） | `PluginConfigLoader.loadGroupOverride` |
| `reference/.../Agent/srcGet/{op}.json` | 人工 / sync 归档 | admin `srcGet`、PluginConfigLoader 基线 |
| `config/groups/{roomId}.yaml` | 总控 / 人工 | bot-server 群授权、yaml sign 兜底 |

常量定义：`packages/plugin-config/src/override-paths.ts`

---

## 契约测试

```powershell
# 静态（无需服务）
pnpm contracts:static

# 运行时（需对应服务在线，离线则 SKIP）
pnpm contracts:runtime

# 全部
pnpm contracts
```

脚本目录：`scripts/contracts/`

---

## 变更流程

1. 提议变更 → 在集成会话讨论  
2. 更新本目录对应 `.md`  
3. 更新 `scripts/contracts/` 或 `scripts/e2e-*.mjs`  
4. 更新 `docs/development/CURRENT.md` §已完成 / §待办  
5. merge + 跑集成闸门（见 CURRENT.md §7）
