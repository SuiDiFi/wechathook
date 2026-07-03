# 云端域名规范（sc5.top）

> **原则：** 域名前缀表达**给谁用**，与进程内端口解耦。对外只走 Nginx 443；`8788`/`8790` 仅绑定本机。

---

## 1. 子域名分工

| 前缀 | 子域名 | 反代目标 | 给谁用 | 典型路径 |
|------|--------|----------|--------|----------|
| **bot** | `bot.sc5.top` | admin `:8790` | 总代（人） | `/agent/`、 `/api/Agent/*` |
| **admin** | `admin.sc5.top` | admin `:8790` | 官方总控（人） | `/console/`、 `/api/master/*` |
| **api** | `api.sc5.top` | bot-server `:8788` | 程序 / 桥接 | `/super/*`、 `/health` |

```
                    Internet (HTTPS)
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   bot.sc5.top      admin.sc5.top      api.sc5.top
   (总代 UI)         (总控 UI)          (引擎 API)
         │                 │                 │
         └────────┬────────┘                 │
                  ▼                           ▼
            admin :8790                 bot-server :8788
```

**禁止混用：**

- 不要在浏览器打开 `api.sc5.top` 当后台（根路径无页面，仅 `/health` 与 `/super/*`）。
- 不要把 `botServer.url` 指到 `bot.sc5.top`（那是总代 UI 域名，不是引擎）。

---

## 2. 入口 URL（生产）

| 用途 | URL | 账号 |
|------|-----|------|
| 萌兔总代 | https://bot.sc5.top/agent/ | `1000` / `000000` |
| 官方总控 | https://admin.sc5.top/console/ | 见 `config/admin.production.yaml` |
| 引擎健康检查 | https://api.sc5.top/health | — |
| 群消息回调 | https://api.sc5.top/super/msg/callback | POST |

根路径行为（Nginx）：

- `https://bot.sc5.top/` → 302 → `/agent/`
- `https://admin.sc5.top/` → 302 → `/console/`
- `https://api.sc5.top/` → 404（正常，请用 `/health`）

---

## 3. 本地 / 边缘配置

**gateway、relay-bridge** 指向引擎 API 域名：

```yaml
# config/bot.yaml
botServer:
  url: "https://api.sc5.top"
```

```yaml
# config/relay-bridge.yaml
botServer: "https://api.sc5.top"
```

Docker 内 admin → bot-server 仍用 compose 内网 `http://bot-server:8788`，**不要**写公网 `api.sc5.top`。

---

## 4. 环境变量（部署脚本）

`deploy/scripts/cloud-bootstrap.sh`：

| 变量 | 默认 | 含义 |
|------|------|------|
| `DOMAIN_BOT` | `bot.sc5.top` | 总代 UI |
| `DOMAIN_ADMIN` | `admin.sc5.top` | 总控 UI |
| `DOMAIN_API` | `api.sc5.top` | bot-server API |

---

## 5. 验证

```bash
curl -s https://api.sc5.top/health
curl -s https://bot.sc5.top/health    # admin 进程
curl -s https://admin.sc5.top/health
```

```powershell
$env:ADMIN_URL="https://bot.sc5.top"   # 或 admin.sc5.top
$env:ADMIN_TOKEN="<auth.token>"
pnpm e2e:cloud
```

---

## 6. 从旧方案迁移

| 旧 | 新 |
|----|-----|
| `https://bot.sc5.top/health`（引擎） | `https://api.sc5.top/health` |
| `https://admin.sc5.top/agent/`（总代） | `https://bot.sc5.top/agent/` |
| `botServer.url: https://bot.sc5.top` | `botServer.url: https://api.sc5.top` |

服务器上更新 Nginx 并重签证书后，本地改 `config/bot.yaml` 并重启 gateway / relay-bridge。
