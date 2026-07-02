# MVP v1.0 — 萌兔同构最小可交付

**目标日期：** Phase 1+2 合并交付（约 3–4 周）  
**北极星：** 授权群走 **自建 bot-server**，本地 **rabbitr inject** 收发，不依赖萌兔官方 `/super/*` 云端。

---

## 1. MVP v1.0 范围（In / Out）

### In ✅

| # | 能力 | 验收 |
|---|------|------|
| 1 | `Rabbitr41955Adapter` | `POST /r/stm` 发群文本 |
| 2 | `transport.mode: rabbitr41955` | gateway 按配置选传输层 |
| 3 | bot-server | callback + sign + explis + **菜单/帮助** |
| 4 | relay-bridge PoC | 萌兔壳 `/super/*` → `127.0.0.1:8788` |
| 5 | inject API 归档 | `reference/.../inject-session/` |
| 6 | 单群 yaml 配置 | `57226609398@chatroom` 授权 + 签到 |
| 7 | E2E 脚本 | `scripts/e2e-mvp-sign.mjs` |

### Out ❌（v1.1+）

- admin H5、激活码、77 op 全量
- 107 插件、猜题/RPG
- Win 协议、挂机宝云 PC
- Tauri 桌面壳
- libGLES 4.1.8.27 主路径

---

## 2. 多 Agent 分工（MVP v1.0）

**结论：不设常驻 Debug Agent。** 用 **G-Integration** 在里程碑闸门做集成验收；模块内 bug 由责任 Agent 自修。

| 代号 | 职责 | MVP 交付 | 并行 |
|------|------|----------|------|
| **A-Transport** | rabbitr 适配、inject 配置、gateway 传输切换 | P1 全部 | ✅ |
| **B-BotServer** | callback msg_type、菜单/帮助、explis 完善 | bot-server ≥60% | ✅ |
| **D-Relay** | relay-bridge PoC（api 转发 bot-server） | `apps/relay-bridge` 最小 | ✅ |
| **E-Spec** | 日志抽 API、inject-session 归档 | 脚本 + JSON | ✅ |
| **G-Integration** | **闸门验收**：build + E2E + 日志 diff | 每 Phase 结束 1 次 | 串行在最后 |

**不启动：** C-Config（admin schema 留 v1.1）、常驻 Debug。

### G-Integration 检查清单

```
[ ] pnpm build
[ ] bot-server /health + explis + callback 签到
[ ] gateway + rabbitr41955 sendText（或 mock）
[ ] relay-bridge 转发 1 条真实 callback
[ ] 与萌兔官方回复格式 diff（签到/菜单，≥90% 字段）
```

---

## 3. 里程碑

| 里程碑 | 内容 | 负责 |
|--------|------|------|
| **M1** | Transport + gateway 切换 | A |
| **M2** | bot-server 菜单/帮助 + msg_type 1 | B |
| **M3** | relay-bridge PoC | D |
| **M4** | inject 归档 + E2E | E + G |

**v1.0 发布标准：** M1–M4 全绿 + 授权群「签到」「菜单」走自建 bot-server 闭环。

**2026-06-26 进度：** M1/M2/M3/M4 E2E 脚本全绿（bot-server + relay-bridge）；萌兔壳 hosts 劫持待用户管理员执行。

---

## 4. 启动 Prompt（复制到新会话）

```
wechathook MVP v1.0。读 docs/development/mvp-v1.0.md 和 roadmap-mengtu-parity-2026-06-26.md。
我是 [A-Transport|B-BotServer|D-Relay|E-Spec|G-Integration]，执行对应 MVP 交付。
```

---

## 5. 相关文档

- [主路线图](./roadmap-mengtu-parity-2026-06-26.md)
- [存档检查点 2026-06-26](./archive-checkpoint-2026-06-26.md)
