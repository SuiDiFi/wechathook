# Phase 0 完成检查点

**日期：** 2026-06-26  
**下一阶段：** Phase 1 — Rabbitr41955Transport

## 已完成

- monorepo：gateway、bot-server、bot-core、hook-adapter、5 插件
- bot-server：`/super/msg/callback|explis|lis|scu` + SignEngine
- 萌兔归档：77 op、107 插件、群空间登录流
- inject 实测：4.1.9.55、`/r/stm`、`19088`、callback 同构

## 下一会话入口

`docs/development/mvp-v1.0.md` + `roadmap-mengtu-parity-2026-06-26.md` §8

## Phase 1 已启动（2026-06-26）

- [x] `packages/transport` + `createTransport`
- [x] `Rabbitr41955Adapter`（/r/stm、/r/sqe）
- [x] gateway `transport.mode: rabbitr41955`
- [x] inject API 归档 manifest
- [x] bot-server 菜单 + 查有效期引擎
- [x] `apps/relay-bridge` PoC（8789 → 8788）
- [x] **G-Integration E2E 全绿**（`pnpm e2e:mvp`）
- [x] `packages/plugin-config` — 77 op 加载，sign/menu 驱动 bot-server
- [x] MVP 运行手册 `docs/development/mvp-runbook.md`
- [ ] hosts + HTTPS 443 萌兔壳全量劫持（需管理员）
