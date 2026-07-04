# 本地 → GitHub + Gitee → 服务器 更新清单

> 给不熟悉命令行的同学：日常只需让 Cursor Agent 按本文执行；自己操作时按下面步骤复制即可。  
> **国内腾讯云服务器**请从 **Gitee** 拉代码（已验证可用）；GitHub 作备份/协作主仓。

---

## 一、你在 Cursor 里怎么说

```
按 docs/development/deploy-checklist.md 执行完整部署：
本地已改完 → push GitHub + Gitee → 服务器从 Gitee pull → 重建 Docker → 验证 health
```

---

## 二、本地（Windows PowerShell）

在项目根目录 `d:\wechathook` 执行。

### 1. 看改了什么

```powershell
cd d:\wechathook
git status
git diff --stat
```

### 2. 合并前自检（G-Integration 必跑）

```powershell
pnpm build
pnpm contracts
pnpm e2e:mvp
```

### 3. 提交并推到 GitHub + Gitee

```powershell
git add -A
git commit -m "你的提交说明"
git push origin master
git push gitee master
```

| 远程 | 地址 | 用途 |
|------|------|------|
| `origin` | https://github.com/SuiDiFi/wechathook | 主仓 / 协作 |
| `gitee` | https://gitee.com/airuan/wechathook | **国内服务器拉取** |

本地若还没有 `gitee` 远程，执行一次：

```powershell
git remote add gitee https://gitee.com/airuan/wechathook.git
```

> 若 push 失败（要登录）：GitHub 用 Personal Access Token；Gitee 用「私人令牌」或已配置的 SSH 密钥。

---

## 三、服务器（SSH 登录后）

```bash
ssh ubuntu@118.25.42.248
```

### 1. 拉最新代码（从 Gitee）

```bash
cd /opt/wechathook
git pull origin master
```

服务器 `origin` 已指向 Gitee：`https://gitee.com/airuan/wechathook.git`  
（国内腾讯云 **可以** 正常拉 Gitee；GitHub 443 常超时，勿再依赖。）

> 若仓库改为 **私有**：在 Gitee 仓库 → 管理 → 部署公钥，把服务器 `~/.ssh/id_rsa.pub` 加为只读公钥，并把 remote 改为 `git@gitee.com:airuan/wechathook.git`。

### 2. Nginx 配置有变时（改了 `deploy/nginx/wechathook.conf` 才需要）

```bash
sudo cp deploy/nginx/wechathook.conf /etc/nginx/sites-available/wechathook.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 重建并启动容器（代码 / Dockerfile 有变时必跑）

```bash
cd /opt/wechathook
docker compose -f deploy/docker-compose.cloud.yml up -d --build
```

### 4. 验证

```bash
curl -s https://api.sc5.top/health
curl -s https://bot.sc5.top/health
curl -s https://admin.sc5.top/health
```

浏览器访问：

| 用途 | URL |
|------|-----|
| 萌兔总代 | https://bot.sc5.top/agent/ |
| 官方总控 | https://admin.sc5.top/console/ |

改 adaptive 后请 **强刷** 或关闭页面重进，确认 URL 带新版本号 `?v=7` 等。

---

## 四、本地 E2E 打云（可选）

```powershell
cd d:\wechathook
$env:ADMIN_URL="https://bot.sc5.top"
$env:ADMIN_TOKEN="<服务器 config/admin.production.yaml 里的 auth.token>"
pnpm e2e:cloud
```

---

## 五、什么改动需要哪几步

| 改了什么 | 本地 push 双远程 | 服务器 git pull | docker rebuild | nginx reload |
|----------|------------------|-----------------|----------------|--------------|
| 仅文档 | ✅ | 可选 | ❌ | ❌ |
| `adaptive.css/js`、`mengtu-ui.ts` | ✅ | ✅ | ✅ admin | ❌ |
| `apps/admin` 其它 TS | ✅ | ✅ | ✅ admin | ❌ |
| `bot-server` / `bot-core` / plugins | ✅ | ✅ | ✅ 全部 | ❌ |
| `deploy/nginx/*.conf` | ✅ | ✅ | ❌ | ✅ |
| `config/admin.production.yaml` | ❌ 勿提交 | 服务器手改 | 重启 admin | ❌ |

---

## 六、不要做的事

- **不要**把 `config/admin.production.yaml`（含 token）提交 Git
- **不要**长期用 `docker cp` 热更新代替 `git pull + rebuild`（难回滚、和 GitHub 不一致）
- **不要**对 `master` 做 `git push --force`

---

## 七、回滚（出问题时）

**本地回到某一版：**

```powershell
git log --oneline -5
git reset --hard <commit-id>
git push origin master   # 仅当确定要让远程也回滚（慎用）
```

**服务器跟 Gitee 对齐：**

```bash
cd /opt/wechathook
git fetch origin
git reset --hard origin/master
docker compose -f deploy/docker-compose.cloud.yml up -d --build
```

---

## 八、备用：服务器连 GitHub / Gitee 都失败时（bundle 同步）

**本地 Windows（Cursor 可代劳）：**

```powershell
cd d:\wechathook
git push origin master
git bundle create $env:TEMP\wechathook.bundle master
# 随后由 Cursor 通过 SSH/SFTP 上传 bundle 到服务器 /tmp/wechathook.bundle
```

**服务器：**

```bash
cd /opt/wechathook
git fetch /tmp/wechathook.bundle master:refs/remotes/bundle/master
git reset --hard refs/remotes/bundle/master
docker compose -f deploy/docker-compose.cloud.yml up -d --build
```

---

## 九、Gitee 镜像（国内服务器推荐）

| 项 | 值 |
|----|-----|
| Gitee | https://gitee.com/airuan/wechathook |
| 服务器 `origin` | `https://gitee.com/airuan/wechathook.git` |
| 同步方式 | 本地 `git push gitee master`（与 GitHub 同内容） |

**你只需保证：** 每次本地 commit 后 **两个远程都 push**；服务器上执行 `git pull` 即可。

---

## 十、仓库与路径速查

| 项 | 值 |
|----|-----|
| GitHub | https://github.com/SuiDiFi/wechathook |
| Gitee（国内拉取） | https://gitee.com/airuan/wechathook |
| 服务器目录 | `/opt/wechathook` |
| Compose 文件 | `deploy/docker-compose.cloud.yml` |
| 域名规范 | [domain-convention.md](./domain-convention.md) |
| 云端详细说明 | [cloud-deploy-sc5.md](./cloud-deploy-sc5.md) |
