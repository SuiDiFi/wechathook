# 项目目录说明

> 快速定位「什么代码在哪」。归档与冗余见 [`_archive/README.md`](../../_archive/README.md)。

---

## 顶层结构

```
wechathook/
├── apps/                 # 可运行服务入口
│   ├── admin/            # 总控 /console + 萌兔总代 /agent
│   ├── bot-server/       # 云端 /super/* 引擎
│   ├── gateway/          # 本地 Hook 网关
│   └── relay-bridge/     # 萌兔壳 → bot-server 桥
├── packages/             # 共享库
│   ├── shared/           # 类型与接口
│   ├── hook-adapter/     # Hook 入站/出站
│   ├── bot-core/         # 引擎、super、插件注册
│   ├── plugin-config/    # 77 op 解析与 overrides
│   └── transport/        # rabbitr41955 传输
├── plugins/              # 热插拔玩法（# 指令）
├── config/               # 运行时 YAML
├── data/                 # seed、overrides、master 策略（部分 gitignore）
├── reference/            # 萌兔规格归档（只读对照）
├── scripts/              # 活跃：E2E、契约、sync、运维
├── deploy/               # Docker / Nginx / 上云
├── docs/                 # 开发文档
└── _archive/             # 冗余与历史（不参与构建）
```

---

## Admin 双后台

| 入口 | 源码/静态 |
|------|-----------|
| `/console/` | `apps/admin/public/console/` + `src/master/` |
| `/agent/` | `reference/.../static/` + `src/mengtu-*.ts` + `public/mengtu/` |

**勿用：** `apps/admin/public/agent/`（已迁 `_archive/deprecated/admin-agent-spa/`）

详见 [admin-ui-architecture.md](./admin-ui-architecture.md)。

---

## Scripts 分类

| 类型 | 路径 | 示例 |
|------|------|------|
| E2E | `scripts/e2e-*.mjs` | `e2e:sign-alignment` |
| 契约 | `scripts/contracts/` | `pnpm contracts` |
| 同步 | `scripts/sync-mengtu-static.mjs` | `pnpm sync:mengtu-static` |
| 运维 | `scripts/inject-wechat.cmd`、`setup-hosts-mengtu.ps1` | 本地 inject |
| 归档侦察 | `_archive/scripts/recon/` | 一次性抓包脚本 |

---

## Config

| 文件 | 环境 |
|------|------|
| `config/bot.yaml` | gateway / bot 本地 |
| `config/admin.yaml` | admin 本地 |
| `config/admin.production.yaml` | admin 云（gitignore，用 `.example` 模板） |
| `config/groups/*.yaml` | 群授权与 sign 兜底 |

---

## 集成与 Agent 窗口

- 状态：[CURRENT.md](./CURRENT.md)
- 契约：[contracts/README.md](./contracts/README.md)
- Cursor 规则：`.cursor/rules/wechathook-*.mdc`
