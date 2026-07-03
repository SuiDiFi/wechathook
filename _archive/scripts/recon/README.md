# 归档：一次性侦察 / 同步脚本

这些脚本用于萌兔抓包、路由/catalog 提取、早期静态下载，**已不在 `package.json` 中注册**。

活跃同步请用：`scripts/sync-mengtu-static.mjs`（`pnpm sync:mengtu-static`）。

| 脚本 | 原用途 |
|------|--------|
| `download-mtrobot-agent-portal.js` | 早期 portal 下载 |
| `extract-api-paths.js` / `extract-api-prefix.js` | 从 bundle 抽 API 路径 |
| `extract-vue-routes.js` | 抽 Vue 路由 |
| `extract-mtrobot-catalog.js` | 插件 catalog |
| `sync-mtrobot-*.js` | 只读/API 样例同步 |
| `capture-mt-group-space.mjs` / `fetch-mt-group-space-login.mjs` | 群空间抓包 |
| `probe-mt-bundle.mjs` / `scan-strings.js` | bundle 探测 |
| `extract-vant-icons.mjs` | 从过期 CSS 抽 Vant 图标（依赖已归档 hash） |
