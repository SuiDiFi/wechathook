#!/usr/bin/env python3
"""One-shot remote deploy for sc5.top — run locally, not committed with secrets."""
import paramiko
import secrets
import string
import sys

HOST = "118.25.42.248"
USER = "ubuntu"
PASS = "airuan@1688"

ADMIN_TOKEN = secrets.token_hex(24)
MASTER_PASSWORD = "".join(
    secrets.choice(string.ascii_letters + string.digits) for _ in range(20)
)

DEPLOY_SCRIPT = f"""set -euo pipefail
export ADMIN_TOKEN='{ADMIN_TOKEN}'
export MASTER_PASSWORD='{MASTER_PASSWORD}'
export REPO_URL='https://github.com/SuiDiFi/wechathook.git'
export APP_DIR='/opt/wechathook'
export DOMAIN_BOT='bot.sc5.top'
export DOMAIN_ADMIN='admin.sc5.top'

echo "ADMIN_TOKEN=$ADMIN_TOKEN"
echo "MASTER_PASSWORD=$MASTER_PASSWORD"

if ! command -v docker >/dev/null 2>&1; then
  echo '==> Installing Docker + deps (apt mirror)'
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git nginx docker.io docker-compose-v2
  sudo systemctl enable --now docker
  sudo usermod -aG docker ubuntu
fi

if [ ! -f /etc/docker/daemon.json ]; then
  echo '==> Docker registry mirror (Tencent Cloud)'
  sudo mkdir -p /etc/docker
  echo '{{"registry-mirrors":["https://mirror.ccs.tencentyun.com"]}}' | sudo tee /etc/docker/daemon.json >/dev/null
  sudo systemctl restart docker
  sleep 3
fi

sudo mkdir -p /opt
if [ ! -d /opt/wechathook/.git ]; then
  sudo git clone "$REPO_URL" /opt/wechathook
  sudo chown -R ubuntu:ubuntu /opt/wechathook
else
  git -C /opt/wechathook pull --ff-only
fi

cd /opt/wechathook

if [ ! -f config/admin.production.yaml ]; then
  cp config/admin.production.yaml.example config/admin.production.yaml
  sed -i "s/CHANGE_ME_STRONG_TOKEN/${{ADMIN_TOKEN}}/" config/admin.production.yaml
  sed -i "s/CHANGE_ME_MASTER_PASSWORD/${{MASTER_PASSWORD}}/" config/admin.production.yaml
fi

echo '==> Docker Compose build (may take several minutes)'
export ADMIN_TOKEN MASTER_PASSWORD
DOCKER='sudo docker'
$DOCKER compose -f deploy/docker-compose.cloud.yml up -d --build

echo '==> Nginx'
sudo cp deploy/nginx/wechathook.conf /etc/nginx/sites-available/wechathook.conf
sudo ln -sf /etc/nginx/sites-available/wechathook.conf /etc/nginx/sites-enabled/wechathook.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo '==> Certbot HTTPS'
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d bot.sc5.top -d admin.sc5.top --non-interactive --agree-tos -m admin@sc5.top --redirect || true

echo '==> Health checks'
sleep 8
echo -n '8788: '; curl -s http://127.0.0.1:8788/health || echo FAIL
echo
echo -n '8790: '; curl -s http://127.0.0.1:8790/health || echo FAIL
echo
echo -n 'bot: '; curl -s http://bot.sc5.top/health || echo FAIL
echo
echo -n 'admin: '; curl -s http://admin.sc5.top/health || echo FAIL
echo
$DOCKER compose -f deploy/docker-compose.cloud.yml ps
echo DEPLOY_DONE
"""


def main() -> int:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    print("Connected. Starting deploy...", flush=True)
    print(f"LOCAL_ADMIN_TOKEN={ADMIN_TOKEN}", flush=True)
    print(f"LOCAL_MASTER_PASSWORD={MASTER_PASSWORD}", flush=True)

    stdin, stdout, stderr = client.exec_command("bash -s")
    stdin.write(DEPLOY_SCRIPT)
    stdin.channel.shutdown_write()

    for line in iter(stdout.readline, ""):
        try:
            print(line, end="", flush=True)
        except UnicodeEncodeError:
            print(line.encode("utf-8", errors="replace").decode("utf-8"), end="", flush=True)

    exit_code = stdout.channel.recv_exit_status()
    err = stderr.read().decode()
    if err:
        print("STDERR:", err, flush=True)
    print("EXIT", exit_code, flush=True)
    client.close()
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
