# 契约：配置合并优先级

## Sign（签到）

```
resolveSignConfig(roomId)
  ← resolveOp(roomId, "sign")
       ← loadGroupOverride(roomId, "sign")   [data/group-overrides/{roomId}/sign.json]
       ← loadAgentOp("sign")                 [reference + data/agent-overrides/sign.json]
```

**SignEngine 运行时：**

| 条件 | 行为 |
|------|------|
| 萌兔 `switch_checked` 开启 | 使用萌兔 keyword / template / 金币范围 |
| 萌兔 op 关闭或未加载 | 回退 `config/groups/{roomId}.yaml` → `sign` |
| 两者皆无 | 使用 SignEngine 内置 DEFAULT |

**注意：** yaml 的 `sign.keyword: "签到"` **不会**覆盖已启用的萌兔 op。

---

## Menu（菜单）

```
resolveMenuText(roomId)
  ← resolveOp(roomId, "menu")
  ← form.message 非空则用，否则内置 FALLBACK_MENU
```

关键词触发：`菜单` | `功能` | `功能菜单`（硬编码于 MenuEngine）

---

## 群授权

```
isGroupLicensed(config, roomId)
  ← config/groups/{roomId}.yaml 的 licenseExpires
  ← 或 explis 返回的 expires
```

未授权群：callback 不回复业务内容。

---

## 文件命名

| 类型 | 路径 |
|------|------|
| 总代覆盖 | `data/agent-overrides/{op}.json` |
| 群覆盖 | `data/group-overrides/{roomId}/{op}.json` |
| 归档基线 | `reference/mtrobot-agent-portal/api-samples/full-sync/Agent/srcGet/{op}.json` |
| 群 yaml | `config/groups/{roomId}.yaml` |

**op 名** 与萌兔一致（如 `sign`、`menu`、`welcome`），共 77 个，见 `PluginConfigLoader.listAgentOps()`。
