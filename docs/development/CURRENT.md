# 项目当前状态（集成会话必读）

> **用途：** 多 Agent 窗口开发时的单一事实来源。功能窗口开新会话前先读本文；交卷后由集成会话更新本节。  
> **最后更新：** 2026-07-03

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
| bot-server | `pnpm start:server` | http://127.0.0.1:8788/health · **云** https://api.sc5.top/health |
| admin | `pnpm start:admin` | http://127.0.0.1:8790/health · **云** https://bot.sc5.top/health 或 https://admin.sc5.top/health |
| relay-bridge | `pnpm start:relay` | http://127.0.0.1:8789/health |
| gateway | `pnpm start` | http://127.0.0.1:8787/health |

| UI | URL | 账号 |
|----|-----|------|
| 萌兔总代 | http://127.0.0.1:8790/agent/ · **云** https://bot.sc5.top/agent/ | `1000` / `000000` |
| 官方总控 | http://127.0.0.1:8790/console/ · **云** https://admin.sc5.top/console/ | `admin` / `123456`（本地）· 云见 `admin.production.yaml` |

**云端域名规范：** [domain-convention.md](./domain-convention.md)（`bot`=总代 · `admin`=总控 · `api`=引擎）

**E2E 测试群：** `57226609398@chatroom`（见 `config/groups/57226609398@chatroom.yaml`）

---

## 3. Agent 窗口分工

| 代号 | 窗口职责 | 主要目录 | 禁止修改 |
|------|----------|----------|----------|
| **G-Integration** | 合并、联调、契约测试、更新本文 | 全仓（以合并为主） | — |
| **A-Cloud** | bot-server、bot-core super、plugins | `apps/bot-server`、`packages/bot-core`、`plugins/` | hook、inject、萌兔静态 |
| **B-Admin** | 萌兔 UI、srcGet/srcPost、overrides、**总控/总代 UI 规范** | `apps/admin`、`packages/plugin-config`、`data/` | rabbitr、gateway、`_archive` 内已归档 SPA |

**B-Admin 必读：** [admin-ui-architecture.md](./admin-ui-architecture.md)
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
- [x] menu op 端到端对齐（`pnpm e2e:menu-alignment`）
- [x] 总控 `/console` JS 模块化（`js/core.js` + tab 拆分）
- [x] `providers/types.ts` 统一 `buildXxx(ctx)` 签名

---

## 5. 进行中 / 待办

| 项 | 负责窗口 | 状态 |
|----|----------|------|
| 群级 `group-overrides` UI 写入 | B-Admin | 待做 |
| rabbitr41955 完整闭环（真实群） | C-Local | 部分完成 |
| admin + bot-server 上云部署 | D-DevOps | **已完成**（域名见 [domain-convention.md](./domain-convention.md)） |
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
pnpm e2e:menu-alignment # admin → bot 菜单对齐（需 admin + bot-server）
pnpm e2e:cloud          # admin ↔ bot-server 探针（需 admin + bot-server）
```

全部通过后再 merge feature 分支到集成分支。

---

## 8. 交卷区（由各窗口填写，集成会话合并后清空）

## 交卷 · B-Admin · 2026-07-03

### 目标
1. `/console/app.js` 按 tab 拆模块  
2. menu op 端到端（复制 sign 模式）  
3. `providers/types.ts` 统一 `buildXxx()` 签名  

### 改动文件
- `apps/admin/public/console/js/` — `core.js`、`components.js`、`tab-*.js`（5 tab）
- `apps/admin/public/console/app.js` — 精简为登录 + init shell
- `apps/admin/public/console/index.html` — 多 script 加载
- `apps/admin/src/console-ui.ts` — `GET /console/js/:name`
- `apps/admin/src/providers/types.ts` — `ProviderContext`、`ApiBuilder`、`apiOk`
- `apps/admin/src/providers/local-api.ts` — 全部 `buildXxx(ctx)`
- `apps/admin/src/mengtu-api.ts` — `providerCtx()` 调用
- `packages/plugin-config/src/loader.ts` — `describeMenu`
- `packages/bot-core/src/super-server.ts` — `GET /super/debug/menu`
- `scripts/e2e-menu-alignment.mjs`、`package.json` — `e2e:menu-alignment`
- `docs/development/contracts/admin-bot.md`、`README.md`
- `scripts/contracts/static.mjs`、`runtime.mjs`

### 契约影响
- [x] 有变更 → 已更新 `admin-bot.md`（menu 段）、runtime 探针

### 验证命令
```powershell
pnpm build
pnpm contracts:static
pnpm start:server   # 另开终端
pnpm start:admin
pnpm e2e:menu-alignment
pnpm e2e:admin-ui   # 总控页面可加载
```

### 未做 / 阻塞
- 无

---

## 交卷 · D-DevOps · 2026-07-03（域名规范增补）

### 目标
确立 `bot`=总代 · `admin`=总控 · `api`=引擎 三域名规范，更新 Nginx 模板与本地配置。

### 改动文件
- `docs/development/domain-convention.md` — 规范文档
- `deploy/nginx/wechathook.conf` — 三 server 块 + 根路径跳转
- `deploy/scripts/cloud-bootstrap.sh` — `DOMAIN_API`、certbot 三域
- `config/bot.yaml`、`config/relay-bridge.yaml` — `api.sc5.top`
- `docs/development/CURRENT.md`、`cloud-deploy-sc5.md`

### 服务器待执行（合并 push 后）
```bash
cd /opt/wechathook && git pull
sudo cp deploy/nginx/wechathook.conf /etc/nginx/sites-available/wechathook.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d bot.sc5.top -d admin.sc5.top -d api.sc5.top --expand
```

---

## 交卷 · D-DevOps · 2026-07-03

### 目标
将 bot-server + admin 部署到 Ubuntu `118.25.42.248`，配置 Nginx 反代与 Let's Encrypt，验证 `https://bot.sc5.top/health` 与 `https://admin.sc5.top/health`。

### 改动文件
- `deploy/Dockerfile.bot-server` — 复制 `scripts/`、安装 native 构建依赖、pnpm allowBuilds、构建依赖链
- `deploy/Dockerfile.admin` — 同上 + `COPY data`（admin-seed）
- `deploy/docker-compose.cloud.yml` — 挂载 `data/admin-seed`、`data/master` 到 admin 容器
- `deploy/scripts/cloud-bootstrap.sh` — 改用 apt 安装 Docker、腾讯云镜像加速、sudo compose 兜底
- `pnpm-workspace.yaml` — 修正 `allowBuilds` 占位符为 `true`
- `config/bot.yaml`、`config/relay-bridge.yaml` — 本地指向 `https://bot.sc5.top`
- `apps/admin/src/mengtu-ui.ts` — `config.js` 识别 `X-Forwarded-Proto`，修复 HTTPS 下混合内容导致登录失败
- `docs/development/cloud-deploy-sc5.md` — e2e 补充 `ADMIN_TOKEN` 说明

### 契约影响
- [x] 无 API/路径/配置优先级变更
- [ ] 有变更 → 已更新 docs/development/contracts/*.md

### 验证命令
```powershell
$env:ADMIN_URL="https://admin.sc5.top"
$env:ADMIN_TOKEN="<auth.token>"
pnpm e2e:cloud
# → CLOUD-LOCAL E2E OK
```

### 云端访问
| 入口 | URL | 账号 |
|------|-----|------|
| 萌兔总代 | https://admin.sc5.top/agent/ | `1000` / `000000` |
| 官方总控 | https://admin.sc5.top/console/ | `admin` / 见服务器 `config/admin.production.yaml` 的 `master.password` |

服务器 `config/admin.production.yaml` 已生成（含 `auth.token`，勿提交 Git）。

### 未做 / 阻塞
- 未 push 上述修复到 GitHub；G-Integration 合并后服务器 `git pull` 并重建镜像
- 建议改 SSH 密钥登录并轮换 ubuntu 密码
- `packages/hook-adapter` 缺 `@types/node` — Dockerfile 内临时 `pnpm add`，C-Local 可正式补 devDependency

### 需要其他窗口
- **C-Local**：重启本地 gateway / relay-bridge 使 `config/bot.yaml` 生效
- **G-Integration**：合并 deploy + e2e 修复并 push

<!-- 模板见 docs/development/integration-workflow.md §交卷 -->
