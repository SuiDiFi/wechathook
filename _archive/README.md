# 归档目录（`_archive/`）

> 本目录存放**已弃用、一次性、抓包/侦察、根目录误放**的文件，不参与构建与运行时加载。  
> 活跃代码请勿放入此处；若需恢复某文件，从此目录移回原路径或复制参考。

---

## 目录结构

| 子目录 | 内容 | 说明 |
|--------|------|------|
| [`deprecated/admin-agent-spa/`](deprecated/admin-agent-spa/) | 自建总代 SPA | 原 `apps/admin/public/agent/*`，生产已改用萌兔官方 `/agent/` |
| [`reference-stale/`](reference-stale/) | 过期萌兔静态 hash | HTML 伪装 bundle，已被 `app.56bea7e2.js` 等替代 |
| [`root-scratch/`](root-scratch/) | 根目录误放文件 | `main.js`（小微客户端拷贝）、`dump.rdb`、temp-mt-* |
| [`notes/`](notes/) | 杂项笔记 | 群指令对照等 |
| [`scripts/recon/`](scripts/recon/) | 一次性侦察/同步脚本 | 萌兔抓包、路由提取、catalog 扫描 |
| [`deploy-oneoff/`](deploy-oneoff/) | 一次性部署 Python 脚本 | SSH 部署试验，正式流程见 `deploy/scripts/cloud-bootstrap.sh` |
| [`scratch/`](scratch/) | 本地试验目录 | playwright-tmp、temp-xv-scan 等 |

---

## 活跃路径对照（勿改）

| 功能 | 正确路径 |
|------|----------|
| 总控 UI | `apps/admin/public/console/` |
| 萌兔总代 UI | `reference/mtrobot-agent-portal/static/` + `mengtu-ui.ts` |
| 总代自适应 | `apps/admin/public/mengtu/` |
| E2E / 契约 | `scripts/e2e-*.mjs`、`scripts/contracts/` |
| 云端部署 | `deploy/docker-compose.cloud.yml`、`deploy/scripts/cloud-bootstrap.sh` |

详见 [`docs/development/project-layout.md`](../docs/development/project-layout.md)。

---

## 归档策略

1. **不删除** — 先迁入 `_archive/`，保留 git 历史（`git mv`）
2. **根目录保持干净** — 仅 monorepo 入口：`package.json`、`apps/`、`packages/`、`config/`、`docs/`、`scripts/`（活跃）
3. **新增试验** — 默认放 `_archive/scratch/`，成熟后再提升到 `scripts/` 或 `apps/`
