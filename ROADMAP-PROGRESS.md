# wechathook 开发进度日志

> 按 [`docs/development/roadmap-mengtu-parity-2026-06-26.md`](docs/development/roadmap-mengtu-parity-2026-06-26.md) 顺序排列。  
> 最后更新：**2026-06-22**

**图例：** `[x]` 已完成 · `[ ]` 未完成 · `[~]` 进行中

---

## 集成层（多 Agent 汇总）

- [x] `docs/development/CURRENT.md` — 实时状态与窗口分工
- [x] `docs/development/contracts/` — admin-bot、super-api、config-priority
- [x] `docs/development/integration-workflow.md` — Git + 文档 + 契约测试
- [x] `.cursor/rules/wechathook-*.mdc` — 集成 / cloud / admin / local 边界
- [x] `pnpm contracts` — 静态 + 运行时契约测试

---

## Phase 0 — 基线冻结

- [x] pnpm monorepo（packages + apps + plugins）
- [x] `apps/gateway` + Hook4xAdapter + 5 内置插件
- [x] SQLite 存储 + PluginRegistry
- [x] 萌兔三层架构报告 + inject/win 双模式日志
- [x] 萌兔规格归档（77 op、107 插件、群空间 API）

---

## Phase 1 — 传输层同构（MVP v1.0 核心）

- [x] P1.1 `packages/transport` — `IWeChatTransport` / `createTransport`
- [x] P1.2 `Rabbitr41955Adapter` — `/r/stm`、`/r/sqe`
- [x] P1.3 inject 规格归档 — `reference/.../inject-session-2026-06-26/`
- [x] P1.4 inject-config 4.1.9.55 — `buildRabbitr41955InjectConfig`
- [x] P1.5 gateway 双模式 — `config/bot.yaml` → `transport.mode: rabbitr41955`
- [x] P1.6 入站归一化 — `normalizeMengtuInjectGroupMessage`
- [x] P1.7a gateway bot-server relay — `BotServerRelay` + `executeCallbacks`
- [x] P1.7b E2E inject 脚本 — `pnpm e2e:inject`
- [x] P1.8 gateway ↔ rabbitr inject 出站联调（`botServer.relayEnabled`，E2E 全绿）
- [x] P1.9 完整闭环：群消息 → bot-server → `/r/stm`（inject 直连，不经萌兔官方云）

**Phase 1 出口：** 授权群「签到/菜单」走自建 bot-server + rabbitr 发出。

---

## MVP v1.0 里程碑

- [x] M1 Transport + gateway 切换
- [x] M2 bot-server 菜单 / 查有效期 / msg_type 1
- [x] M3 relay-bridge PoC（`:8789` → `:8788`）
- [x] M4 inject 归档 + E2E 全绿
- [x] `packages/plugin-config` — 77 op 加载，sign/menu 驱动
- [x] MVP 运行手册 — `docs/development/mvp-runbook.md`
- [~] M5 萌兔壳真实群消息走 relay → bot-server（inject 直连已验；萌兔壳 hosts 待管理员）
- [ ] M6 与萌兔官方回复格式 diff ≥90%（签到/菜单/查有效期）

---

## Phase 2 — 本地薄客户端 / 桥接

- [x] D1 `apps/relay-bridge` — `/super/*` 转发 bot-server
- [x] D2 `/api/*` 透传官方 `api.wxmtu.com`
- [x] `config/relay-bridge.yaml` + `scripts/setup-hosts-mengtu.ps1`
- [x] D3 本地 HTTPS 反向代理（`:443`，`pnpm tls:gen` + `tls.enabled`）
- [ ] D4 `packages/relay-protocol` — callback 编解码
- [ ] D5 `apps/relay-client` — 替代 rabbitrobat 账号槽
- [ ] D6 bridge 模式：保留萌兔 inject，只换云端

---

## Phase 3 — 云端引擎 parity（bot-server）

- [x] B1 `/super/msg/callback|explis|lis|scu` 四路由
- [x] B2 SignEngine + MenuEngine + ExpiryEngine
- [x] B3 群 yaml 授权 + explis
- [x] B4 handleMessagecallback msg_type 16/19/50 类型与 builder
- [ ] B5 msg_type 2 发图/URL
- [ ] B6 经济引擎（金币/钻石/排行榜持久化对齐萌兔）
- [ ] B7 插件波次 T1（greentea/weather/sentence…）
- [ ] B8 插件波次 T2（guess* 统一引擎）
- [ ] B9 插件波次 T3/T4（RPG / 群管）

---

## Phase 4 — 配置面 / 商业层

- [x] C1a 官方总控 `/console/`（登录 + 管控总代：账号/菜单/群/资源）
- [~] C1b 总代 UI 全量复刻 + 总控策略驱动
- [ ] C2 GroupCenterSrc 群覆盖 UI
- [ ] C3 激活码 Product/Codes
- [ ] C4 群空间 entry + 密码页

---

## Phase 5 — 可选扩展

- [ ] Win 协议 `WeChat.Api` 适配器
- [ ] 挂机宝 / 云 PC 槽位
- [ ] Tauri 桌面壳
- [ ] iPad/Mac 云槽 SaaS

---

## 当前运行中的服务

| 服务 | 端口 | 启动命令 |
|------|------|----------|
| bot-server | 8788 | `pnpm start:server` |
| relay-bridge | 8789 / **443**（TLS） | `pnpm start:relay` |
| admin | 8790 | `pnpm start:admin` |

| gateway | 8787 | `pnpm dev` |

**验收：** `pnpm e2e:mvp` · `pnpm e2e:inject` · `pnpm e2e:cloud` · `pnpm e2e:admin-ui`

**UI 入口：** 总控 `http://127.0.0.1:8790/console/`（`admin` / `123456`）· 总代 `http://127.0.0.1:8790/agent/`（`88888` / `000000`）

---

## 下一步（自动推进）

1. C1 完善 admin（GroupCenterSrc 群覆盖编辑）
2. M5：萌兔壳 hosts + HTTPS 真实群测（需管理员）
3. **云部署闸门**：本地 `pnpm e2e:cloud` 全绿后再向你确认云服务器规格

详细规格见 [`docs/development/roadmap-mengtu-parity-2026-06-26.md`](docs/development/roadmap-mengtu-parity-2026-06-26.md)。
