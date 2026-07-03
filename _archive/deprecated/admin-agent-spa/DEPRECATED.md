# ⛔ 已废弃 — 请勿在此目录开发

本目录为早期 **自建总代 SPA** 试验代码，**未挂载到生产路由**。

## 当前生产入口

| 需求 | 正确位置 |
|------|----------|
| 萌兔总代 H5 | `/agent/` → `reference/mtrobot-agent-portal/static/` + `mengtu-ui.ts` |
| 总控后台 | `/console/` → `public/console/` |
| 总代移动端适配 | `public/mengtu/adaptive.css` / `adaptive.js` |

## Agent 开发约束

- **禁止** 新增功能、修复 bug 或引用本目录静态资源到 `server.ts` / `mengtu-ui.ts`
- **禁止** 在 `index.html` 中恢复 `/agent/vant-icons.css` 等自建链路
- 若需改总代 UI：只改官方 bundle 的 **适配层** 与 **API 层**（见 `docs/development/admin-ui-architecture.md`）

## 文件说明（历史遗留）

| 文件 | 说明 |
|------|------|
| `index.html` / `app.js` | 自建 Mint/萌兔风格 SPA，已弃用 |
| `agent.css` / `agent-spatial.css` | 自建样式，与总控 `console.css` 无关 |
| `vant-icons.css` | 图标字体拷贝 |

删除本目录前须确认无文档/脚本引用；当前策略为 **保留 + 废弃标记**，避免误用。
