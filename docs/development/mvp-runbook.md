# MVP v1.0 运行手册

## 架构（当前）

```
萌兔 rabbitrobat (inject 4.1.9.55)
    │  POST /super/msg/callback
    ▼
relay-bridge :8789  ──/super/*──▶  bot-server :8788
    │  /api/* 透传
    ▼
api.wxmtu.com（登录/鉴权仍走官方）

bot-server 读：
  reference/.../Agent/srcGet/*.json   （77 op 总代默认）
  config/groups/*.yaml                （群授权 + 覆盖）
  packages/plugin-config            （合并 sign/menu）
```

## 一键启动（开发）

```powershell
cd d:\wechathook
pnpm install
pnpm build

# 终端 1 — 云端引擎
pnpm start:server

# 终端 2 — API 桥（可选，萌兔壳联调时用）
pnpm start:relay

# 终端 3 — gateway inject 直连（无萌兔壳，rabbitr inject 回调到 gateway）
pnpm dev

# 终端 4 — 官方总控 + 总代后台
pnpm start:admin
# 浏览器:
#   官方总控: http://127.0.0.1:8790/console/  账号 admin / 123456
#   总代 H5:  http://127.0.0.1:8790/agent/     账号 88888 / 000000

# 总控只展示「已落地 / 预览」页；云槽位、购买套餐等萌兔 SaaS 项已隐藏。
# 本地 API 数据：data/admin-seed/ · 群授权：config/groups/*.yaml
# 本地 inject 受限 → 建议 Ubuntu 22.04 + deploy/docker-compose.yml 上云联调

pnpm e2e:admin-ui

# 云端-本地联调探针（需 bot-server + admin）
pnpm e2e:cloud
```

## 萌兔壳切到自建 bot-server（你回来后）

1. 保持 **inject 登录** + `kernelMode: inject`
2. **管理员** PowerShell：
   ```powershell
   .\scripts\setup-hosts-mengtu.ps1 -Enable
   ```
3. 将 `api.wxmtu.com` 指到本机后，启用 `config/relay-bridge.yaml` 中 `tls.enabled: true`（见 `pnpm tls:gen`）
4. **inject 直连（无萌兔壳）**：`config/bot.yaml` 已开 `botServer.relayEnabled`；rabbitr 回调 → gateway:8787 → bot-server → `/r/stm`
5. **当前可验证**：`pnpm e2e:mvp` + `pnpm e2e:inject`

## 配置要点

| 文件 | 作用 |
|------|------|
| `config/bot.yaml` | transport、hook、botWxid |
| `config/groups/57226609398@chatroom.yaml` | 群授权 expires、sign 覆盖 |
| `config/admin.yaml` | 总代后台端口、botServer 上游、ADMIN_TOKEN |

## 云端部署策略（本地优先）

**当前阶段：** 在本地完成 admin + bot-server 开发与 `pnpm e2e:cloud` 联调，**暂不占用云服务器**。

**上云闸门（届时会主动问你）：**

| 项 | 建议 |
|----|------|
| 系统 | **Ubuntu 22.04 LTS** 或 Debian 12（Docker 友好） |
| 配置 | 2C4G 起；bot-server 轻量，admin 同机即可 |
| 开放端口 | 8788（bot-server）、8790（admin）、443（HTTPS 反代） |
| 本地→云 | 改 `config/admin.yaml` 的 `botServer`；relay-bridge / gateway 指向云 IP |

**Docker 一键模拟云上环境：**

```powershell
docker compose -f deploy/docker-compose.yml up --build
pnpm e2e:cloud
```

上云前我会向你确认：系统镜像、域名、SSH 权限，再连服务器做部署与 inject 联调。

## 常用命令

```powershell
pnpm dev:server      # bot-server 热重载
pnpm dev:relay       # relay-bridge 热重载
pnpm extract:inject-api   # 从萌兔日志更新 inject API 归档
```

## 下一步（v1.0 剩余）

- [x] HTTPS 本地代理（`pnpm tls:gen` + relay `tls.enabled`）
- [x] gateway → bot-server → rabbitr 闭环代码（`BotServerRelay`）
- [ ] 真实群消息走 relay / inject 闭环（需 hosts + inject 在线）
- [x] msg_type 16/19/50 执行器（`callback-executor.ts`）
