#!/usr/bin/env bash
# wechathook 云端一键引导 — 在 Ubuntu 服务器上以 ubuntu 用户执行
# 前置：DNS 已配置 bot / admin / api 子域名 → 服务器公网 IP
# 规范：docs/development/domain-convention.md
set -euo pipefail

REPO_URL="${REPO_URL:-https://gitee.com/airuan/wechathook.git}"
APP_DIR="${APP_DIR:-/opt/wechathook}"
DOMAIN_BOT="${DOMAIN_BOT:-bot.sc5.top}"
DOMAIN_ADMIN="${DOMAIN_ADMIN:-admin.sc5.top}"
DOMAIN_API="${DOMAIN_API:-api.sc5.top}"
ADMIN_TOKEN="${ADMIN_TOKEN:?请 export ADMIN_TOKEN=强随机串}"
MASTER_PASSWORD="${MASTER_PASSWORD:?请 export MASTER_PASSWORD=总控密码}"

echo "==> 安装 Docker"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git nginx docker.io docker-compose-v2
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER"
fi

if [ ! -f /etc/docker/daemon.json ]; then
  sudo mkdir -p /etc/docker
  echo '{"registry-mirrors":["https://mirror.ccs.tencentyun.com"]}' | sudo tee /etc/docker/daemon.json >/dev/null
  sudo systemctl restart docker
  sleep 2
fi

echo "==> 拉取代码"
sudo mkdir -p "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
  sudo chown -R "$USER:$USER" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only
fi

cd "$APP_DIR"

echo "==> 生成 config/admin.production.yaml"
if [ ! -f config/admin.production.yaml ]; then
  cp config/admin.production.yaml.example config/admin.production.yaml
  sed -i "s/CHANGE_ME_STRONG_TOKEN/${ADMIN_TOKEN}/" config/admin.production.yaml
  sed -i "s/CHANGE_ME_MASTER_PASSWORD/${MASTER_PASSWORD}/" config/admin.production.yaml
fi

echo "==> 启动 Docker Compose"
export ADMIN_TOKEN MASTER_PASSWORD
if docker compose version >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker compose -f deploy/docker-compose.cloud.yml up -d --build
else
  sudo -E docker compose -f deploy/docker-compose.cloud.yml up -d --build
fi

echo "==> 配置 Nginx"
sudo cp deploy/nginx/wechathook.conf /etc/nginx/sites-available/wechathook.conf
sudo ln -sf /etc/nginx/sites-available/wechathook.conf /etc/nginx/sites-enabled/wechathook.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> 申请 HTTPS（需域名已解析到本机）"
if command -v certbot >/dev/null 2>&1 || sudo apt-get install -y certbot python3-certbot-nginx; then
  sudo certbot --nginx -d "$DOMAIN_BOT" -d "$DOMAIN_ADMIN" -d "$DOMAIN_API" --non-interactive --agree-tos -m "admin@${DOMAIN_ADMIN#*.}" || true
fi

echo ""
echo "=== 部署完成 ==="
echo "引擎 API:    https://${DOMAIN_API}/health"
echo "萌兔总代:    https://${DOMAIN_BOT}/agent/"
echo "官方总控:    https://${DOMAIN_ADMIN}/console/"
echo ""
echo "本地 Windows 修改 config/bot.yaml:"
echo "  botServer.url: https://${DOMAIN_API}"
echo ""
echo "验证: ADMIN_URL=https://${DOMAIN_BOT} pnpm e2e:cloud"
