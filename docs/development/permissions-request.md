# 权限申请清单（用户已授权自主开发）

**状态：** 用户 2026-06-26 授权自行判断执行，无需逐项确认。

## 建议开通（按优先级）

| 权限 | 用途 | 可否替代 |
|------|------|----------|
| **终端 Shell（含网络）** | build、启停服务、E2E | 必须 |
| **修改 `C:\Windows\System32\drivers\etc\hosts`（管理员）** | `api.wxmtu.com` → 127.0.0.1，萌兔壳走 relay-bridge | 可用手动改 hosts |
| **结束占用端口的进程** | 8787/8788/8789 重启 bot-server | 必须 |
| **Smart Mode / 全权限命令** | pnpm、node、curl | 建议 |
| **Git 写操作** | 仅用户明确要求时 commit | 当前不 commit |

## 不需要

- 浏览器自动化（除非 H5 admin）
- 提交 rabbitr.dll 到 git
- 修改萌兔安装目录（只读参考 `D:\Mtrobot\system\`）
