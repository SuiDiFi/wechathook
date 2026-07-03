# 云端部署：sc5.top



> **服务器：** Ubuntu · `118.25.42.248` · 用户 `ubuntu`  

> **域名规范：** [domain-convention.md](./domain-convention.md)  

> **仓库：** https://github.com/SuiDiFi/wechathook



---



## 1. DNS 配置



| 子域名 | 用途 | 指向 |

|--------|------|------|

| `bot.sc5.top` | 萌兔总代 `/agent/` | `118.25.42.248` |

| `admin.sc5.top` | 官方总控 `/console/` | `118.25.42.248` |

| `api.sc5.top` | bot-server `/super/*` | `118.25.42.248` |



泛解析 `*.sc5.top` 已指向本机时，上述子域名自动生效。



---



## 2. 云端跑什么 / 本地跑什么



| 位置 | 组件 | 端口/域名 |

|------|------|-----------|

| **云** | bot-server | `api.sc5.top` → 内网 `8788` |

| **云** | admin | `bot.sc5.top` + `admin.sc5.top` → 内网 `8790` |

| **本地 Windows** | gateway / relay-bridge | `8787` / `8789` |

| **本地** | rabbitr + 微信 | inject |



---



## 3. 一键部署（SSH 登录服务器后执行）



```bash

# 1. 登录

ssh ubuntu@118.25.42.248



# 2. 设置密钥（勿写入 Git）

export ADMIN_TOKEN="$(openssl rand -hex 24)"

export MASTER_PASSWORD="你的总控强密码"

echo "ADMIN_TOKEN=$ADMIN_TOKEN"   # 记下来



# 3. 下载并执行引导脚本

curl -fsSL https://raw.githubusercontent.com/SuiDiFi/wechathook/master/deploy/scripts/cloud-bootstrap.sh -o /tmp/cloud-bootstrap.sh

chmod +x /tmp/cloud-bootstrap.sh

bash /tmp/cloud-bootstrap.sh

```



或克隆仓库后：



```bash

cd /opt/wechathook

export ADMIN_TOKEN="..."

export MASTER_PASSWORD="..."

bash deploy/scripts/cloud-bootstrap.sh

```



---



## 4. 本地指向云端



编辑本地 `config/bot.yaml`：



```yaml

botServer:

  url: "https://api.sc5.top"

  relayEnabled: true

```



编辑本地 `config/relay-bridge.yaml`（若用萌兔壳桥接）：



```yaml

botServer: "https://api.sc5.top"

```



---



## 5. 验证



**云上：**



```bash

curl -s https://api.sc5.top/health

curl -s https://bot.sc5.top/health

curl -s https://admin.sc5.top/health

```



**本地：**



```powershell

$env:ADMIN_URL="https://bot.sc5.top"

$env:ADMIN_TOKEN="<服务器 config/admin.production.yaml 的 auth.token>"

pnpm e2e:cloud

```



---



## 6. 防火墙



```bash

sudo ufw allow OpenSSH

sudo ufw allow 'Nginx Full'

sudo ufw enable

```



`8788`/`8790` 仅绑定 `127.0.0.1`，不直接暴露公网；对外只走 Nginx 443。



---



## 7. D-DevOps 交卷



完成后按 [handoff-template.md](./contracts/handoff-template.md) 交卷给 G-Integration，并更新 [CURRENT.md](./CURRENT.md) 云服务地址。



---



## 安全提醒



- `config/admin.production.yaml` 含 token，**勿提交 Git**（已在 `.gitignore`）

- 部署后建议改为 SSH 密钥登录，并修改服务器密码

- 生产环境务必设置强 `ADMIN_TOKEN` 与 `MASTER_PASSWORD`


