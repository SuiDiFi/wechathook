#!/usr/bin/env python3
"""Resume cloud deploy after partial run — compose build + nginx + certbot."""
import paramiko
import sys

HOST = "118.25.42.248"
USER = "ubuntu"
PASS = "airuan@1688"

RESUME_SCRIPT = r"""set -euo pipefail
cd /opt/wechathook
export ADMIN_TOKEN="$(grep 'token:' config/admin.production.yaml | head -1 | awk '{print $2}' | tr -d '"')"
export MASTER_PASSWORD="$(grep 'password:' config/admin.production.yaml | tail -1 | awk '{print $2}' | tr -d '"')"
echo "Using existing admin.production.yaml credentials"

echo '==> Docker Compose build (may take several minutes)'
sudo docker compose -f deploy/docker-compose.cloud.yml up -d --build

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
echo -n 'bot-http: '; curl -s http://bot.sc5.top/health || echo FAIL
echo
echo -n 'admin-http: '; curl -s http://admin.sc5.top/health || echo FAIL
echo
echo -n 'bot-https: '; curl -sk https://bot.sc5.top/health || echo FAIL
echo
echo -n 'admin-https: '; curl -sk https://admin.sc5.top/health || echo FAIL
echo
sudo docker compose -f deploy/docker-compose.cloud.yml ps
echo DEPLOY_DONE
"""


def main() -> int:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    print("Resuming deploy...", flush=True)

    stdin, stdout, stderr = client.exec_command("bash -s")
    stdin.write(RESUME_SCRIPT)
    stdin.channel.shutdown_write()

    for line in iter(stdout.readline, ""):
        try:
            print(line, end="", flush=True)
        except UnicodeEncodeError:
            print(line.encode("utf-8", errors="replace").decode("utf-8"), end="", flush=True)

    exit_code = stdout.channel.recv_exit_status()
    err = stderr.read().decode("utf-8", errors="replace")
    if err:
        print("STDERR:", err, flush=True)
    print("EXIT", exit_code, flush=True)
    client.close()
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
