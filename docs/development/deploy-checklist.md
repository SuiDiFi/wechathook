# 本地 → GitHub → 服务器 更新清单

> 给不熟悉命令行的同学：日常只需让 Cursor Agent 按本文执行；自己操作时按下面步骤复制即可。

---

## 一、你在 Cursor 里怎么说

```
按 docs/development/deploy-checklist.md 执行完整部署：
本地已改完 → push GitHub → 服务器 pull → 重建 Docker → 验证 health
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

### 3. 提交并推到 GitHub

```powershell
git add -A
git commit -m "你的提交说明"
git push origin master
```

> 若 push 失败（要登录）：在 GitHub 网页生成 Personal Access Token，或用 GitHub Desktop 推送。

---

## 三、服务器（SSH 登录后）

```bash
ssh ubuntu@118.25.42.248
```

### 1. 拉最新代码

```bash
cd /opt/wechathook
git pull origin master
```

> **若 `git pull` 连不上 GitHub**（国内服务器常见）：让 Cursor 用 **Git bundle** 从本地上传（见下文「八、服务器拉不到 GitHub 时」）。

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

| 改了什么 | 本地 push | 服务器 git pull | docker rebuild | nginx reload |
|----------|-----------|-----------------|----------------|--------------|
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

**服务器跟 GitHub 对齐：**

```bash
cd /opt/wechathook
git fetch origin
git reset --hard origin/master
docker compose -f deploy/docker-compose.cloud.yml up -d --build
```

---

## 八、服务器拉不到 GitHub 时（bundle 同步）

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

## 九、仓库与路径速查

| 项 | 值 |
|----|-----|
| GitHub | https://github.com/SuiDiFi/wechathook |
| 服务器目录 | `/opt/wechathook` |
| Compose 文件 | `deploy/docker-compose.cloud.yml` |
| 域名规范 | [domain-convention.md](./domain-convention.md) |
| 云端详细说明 | [cloud-deploy-sc5.md](./cloud-deploy-sc5.md) |
