# 项目当前状态（集成会话必读）

> **用途：** 多 Agent 窗口开发时的单一事实来源。功能窗口开新会话前先读本文；交卷后由集成会话更新本节。  
> **最后更新：** 2026-06-22

---

## 1. 架构分层（云 / 本地）

| 层级 | 部署 | 进程 | 职责 |
|------|------|------|------|
| **L1 配置面** | 云（可同机 dev） | admin `:8790` | 萌兔总代 H5、`srcGet/srcPost`、总控 `/console` |
| **L2 业务引擎** | 云 | bot-server `:8788` | `/super/msg/*`、SignEngine、插件、SQLite |
| **L3 桥接** | 本地 / 边缘 | relay-bridge `:8789` | 萌兔壳 `/super/*` → bot-server |
| **L4 本地客户端** | 本地 Windows | gateway `:8787` | inject 回调、Hook 出站、`#` 指令插件 |

**数据流（签到示例）：**  
萌兔 `/agent` 保存 → `POST /api/Agent/srcPost` → `data/agent-overrides/sign.json` → `PluginConfigLoader` → `SignEngine` → `POST /super/msg/callback` 回复。

**配置优先级：** 群覆盖 `data/group-overrides/{roomId}/` > 总代 `data/agent-overrides/` > 归档 `reference/.../srcGet/` > `config/groups/*.yaml`（仅当萌兔 op 未启用时 yaml 才生效）。

---

## 2. 服务与入口

| 服务 | 命令 | 健康检查 |
|------|------|----------|
| bot-server | `pnpm start:server` | http://127.0.0.1:8788/health |
| admin | `pnpm start:admin` | http://127.0.0.1:8790/health |
| relay-bridge | `pnpm start:relay` | http://127.0.0.1:8789/health |
| gateway | `pnpm start` | http://127.0.0.1:8787/health |

| UI | URL | 账号 |
|----|-----|------|
| 萌兔总代 | http://127.0.0.1:8790/agent/ | `1000` / `000000` |
| 官方总控 | http://127.0.0.1:8790/console/ | `admin` / `123456` |

**E2E 测试群：** `57226609398@chatroom`（见 `config/groups/57226609398@chatroom.yaml`）

---

## 3. Agent 窗口分工

| 代号 | 窗口职责 | 主要目录 | 禁止修改 |
|------|----------|----------|----------|
| **G-Integration** | 合并、联调、契约测试、更新本文 | 全仓（以合并为主） | — |
| **A-Cloud** | bot-server、bot-core super、plugins | `apps/bot-server`、`packages/bot-core`、`plugins/` | hook、inject、萌兔静态 |
| **B-Admin** | 萌兔 UI、srcGet/srcPost、overrides | `apps/admin`、`packages/plugin-config`、`data/` | rabbitr、gateway 出站 |
| **C-Local** | gateway、hook-adapter、relay、transport | `apps/gateway`、`apps/relay-bridge`、`packages/hook-adapter`、`packages/transport` | admin UI、77 op schema |
| **D-DevOps** | 部署、TLS、hosts、Docker | `deploy/`、`config/*.yaml` 生产项、`scripts/setup-*` | 业务逻辑大改 |

**新会话启动 Prompt（复制到对应窗口）：**

```
wechathook 项目。先读 docs/development/CURRENT.md 和 docs/development/contracts/README.md。
我是 [A-Cloud|B-Admin|C-Local|D-DevOps]，只做该窗口职责内改动；交卷按 integration-workflow.md 模板。
```

---

## 4. 已完成里程碑（近期）

- [x] bot-server `/super/*` 四路由 + SignEngine + MenuEngine + ExpiryEngine
- [x] admin 萌兔官方 SPA + 自适应层 v2
- [x] `plugin-config` 读取 `agent-overrides` / `group-overrides`
- [x] 签到端到端对齐（`pnpm e2e:sign-alignment`）
- [x] 萌兔静态 sync 自动解析 hash（`pnpm sync:mengtu-static`）
- [x] MVP v1.0 E2E 全绿（`pnpm e2e:mvp`）

---

## 5. 进行中 / 待办

| 项 | 负责窗口 | 状态 |
|----|----------|------|
| 第二个 op 端到端（如 menu） | B-Admin + A-Cloud | 待做 |
| 群级 `group-overrides` UI 写入 | B-Admin | 待做 |
| rabbitr41955 完整闭环（真实群） | C-Local | 部分完成 |
| admin + bot-server 上云部署 | D-DevOps | 待做 |
| 萌兔壳 hosts 劫持联调 | C-Local + D-DevOps | 待用户管理员执行 |

---

## 6. 已知坑

1. **萌兔 JS/CSS hash 会变** — 白屏时跑 `pnpm sync:mengtu-static` 并重启 admin。
2. **admin 默认只监听 `127.0.0.1`** — 局域网访问需改 `config/admin.yaml` 的 `listen.host`。
3. **`#签到` vs 萌兔「签到」** — 前者走 checkin 插件，后者走 SignEngine；E2E 断言须区分。
4. **改 mengtu-ui / mengtu-api 后** — `pnpm --filter @wechathook/admin build` + 重启 admin。
5. **改 plugin-config / bot-core 后** — 对应包 build + 重启 bot-server。

---

## 7. 集成闸门（合并前必跑）

```powershell
pnpm build
pnpm contracts          # 契约测试（静态 + 可选运行时）
pnpm e2e:mvp            # bot-server 核心
pnpm e2e:sign-alignment # admin → bot 签到对齐（需 admin + bot-server）
pnpm e2e:cloud          # admin ↔ bot-server 探针（需 admin + bot-server）
```

全部通过后再 merge feature 分支到集成分支。

---

## 8. 交卷区（由各窗口填写，集成会话合并后清空）

_暂无待合并交卷。_

<!-- 模板见 docs/development/integration-workflow.md §交卷 -->
