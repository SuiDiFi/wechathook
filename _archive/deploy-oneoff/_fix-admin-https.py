import paramiko
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HOST, USER, PASS = "118.25.42.248", "ubuntu", "airuan@1688"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = c.open_sftp()
for local, remote in [
    (ROOT / "apps" / "admin" / "src" / "mengtu-ui.ts", "/opt/wechathook/apps/admin/src/mengtu-ui.ts"),
    (ROOT / "deploy" / "Dockerfile.admin", "/opt/wechathook/deploy/Dockerfile.admin"),
]:
    sftp.put(str(local), remote)
sftp.close()

cmd = "cd /opt/wechathook && sudo docker compose -f deploy/docker-compose.cloud.yml up -d --build admin"
_, o, e = c.exec_command(cmd, timeout=900)
print(o.read().decode("utf-8", errors="replace"))
err = e.read().decode("utf-8", errors="replace")
if err:
    print(err)
_, o, _ = c.exec_command(
    "sleep 5 && curl -sk https://admin.sc5.top/static/config.js && echo && "
    "curl -sk -X POST https://admin.sc5.top/api/Agent/login -H 'Content-Type: application/json' "
    "-d '{\"username\":\"1000\",\"password\":\"000000\"}'",
    timeout=60,
)
print(o.read().decode("utf-8", errors="replace"))
c.close()
