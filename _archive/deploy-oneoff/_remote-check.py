import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("118.25.42.248", username="ubuntu", password="airuan@1688", timeout=30)
cmds = [
    "sudo docker ps -a",
    "sudo docker compose -f /opt/wechathook/deploy/docker-compose.cloud.yml ps 2>/dev/null || true",
    'curl -s -o /dev/null -w "8788:%{http_code}\\n" http://127.0.0.1:8788/health',
    'curl -s -o /dev/null -w "8790:%{http_code}\\n" http://127.0.0.1:8790/health',
    "grep -E 'token|password' /opt/wechathook/config/admin.production.yaml 2>/dev/null | head -4",
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd, timeout=120)
    print(">>>", cmd)
    print(o.read().decode("utf-8", errors="replace"))
    err = e.read().decode("utf-8", errors="replace")
    if err:
        print(err)
c.close()
