# Admin 双后台架构与 Agent 开发规范

> **读者：** B-Admin 窗口、G-Integration 合并前 review。  
> **目标：** 总控 `/console` 与总代 `/agent` 目录清晰、复用一致、Agent 不乱改。

---

## 1. 双后台模型（必记）

| 入口 | URL | UI 来源 | 能否改 Vue 源码 |
|------|-----|---------|----------------|
| **官方总控** | `/console/` | 自建 SPA | ✅ `public/console/` |
| **萌兔总代** | `/agent/` | 官方 H5 bundle | ❌ 只改适配层 + API |

```
                    apps/admin/src/server.ts
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    mountConsoleUi      mountMasterApi     mountMengtuAgentUi
    /console/*          /api/master/*      /agent/* + /api/Agent/*
           │                  │                  │
           ▼                  ▼                  ▼
  public/console/      master/store.ts    mengtu-api.ts
  (自建 UI)            master/api.ts      mengtu-ui.ts
                                            │
                                            ▼
                              reference/.../static/  (官方 JS/CSS)
                              public/mengtu/         (自适应层)
```

**禁止：** 在 `apps/admin/public/agent/` 重建总代 SPA（已迁至 `_archive/deprecated/admin-agent-spa/`）。

---

## 2. 目录职责（单一事实来源）

```
apps/admin/
├── src/
│   ├── main.ts              # 进程入口
│   ├── server.ts            # Hono 装配：只注册路由，不写大段业务
│   ├── config.ts            # admin.yaml 加载
│   │
│   ├── console-ui.ts        # 【总控】静态文件挂载
│   ├── master/              # 【总控】API + 持久化
│   │   ├── api.ts           # /api/master/*
│   │   ├── auth.ts          # 登录 token
│   │   └── store.ts         # agent 策略、hiddenRoutes
│   │
│   ├── mengtu-ui.ts         # 【总代】index 注入、静态 alias、adaptive
│   ├── mengtu-api.ts        # 【总代】srcGet/srcPost、login
│   ├── mengtu-samples.ts    # 归档 JSON 兜底
│   │
│   ├── providers/           # 【数据层】萌兔 API 响应构造
│   │   ├── local-api.ts     # 已落地：读 seed / yaml / store
│   │   └── empty-api.ts     # 预览页空壳
│   │
│   ├── page-registry.ts     # 【总控】页面 tier：live | preview | hidden
│   └── agent-defaults.ts    # 总代默认账号常量
│
├── public/
│   ├── console/             # ✅ 总控 UI（index.html + app.js + console.css）
│   ├── mengtu/              # ✅ 总代自适应（adaptive.css/js）
│   └── agent/               # ⛔ 仅占位 README，SPA 已迁 _archive/
│
reference/mtrobot-agent-portal/static/   # 萌兔官方 bundle（sync 脚本更新）
data/admin-seed/                         # 菜单/商品等 seed JSON
data/agent-overrides/                    # 总代 srcPost 写入（gitignore）
packages/plugin-config/                  # op 解析，bot-server 只读
```

---

## 3. 新增功能决策树

```
新需求
  │
  ├─ 改总代配置表单（77 op）？
  │     → mengtu-api srcGet/srcPost + plugin-config + bot-core 引擎
  │     → 不改 reference/static/*.js
  │
  ├─ 改总控仪表盘/群管理/总代开关？
  │     → master/api + master/store + public/console/app.js
  │     → 在 page-registry 标 tier
  │
  ├─ 改总代 H5 布局/移动端？
  │     → 只改 public/mengtu/adaptive.css|js + mengtu-ui patchAgentIndexHtml
  │
  └─ 改 bot 运行时逻辑？
        → A-Cloud 窗口，不在 admin 堆业务
```

---

## 4. 代码规范（Agent 必须遵守）

### 4.1 总控 `/console`

| 规则 | 说明 |
|------|------|
| **三文件原则** | UI 只在 `index.html` / `app.js` / `console.css`；新页先加 `page-registry` |
| **API 分离** | 业务 API 放 `master/api.ts`，不在 `app.js` 里 mock 持久数据 |
| **样式变量** | 颜色/间距用 `console.css` 顶部 `:root` CSS 变量，禁止 magic number 散落 |
| **tier 标记** | `live` = 真实数据；`preview` = 空壳；`hidden` = 总控隐藏 |

### 4.2 总代 `/agent`

| 规则 | 说明 |
|------|------|
| **不改 bundle** | 不编辑 `reference/.../static/js/app.*.js` |
| **适配层唯一** | 样式/断点/壳层 → `public/mengtu/adaptive.*`；改完递增 `ADAPTIVE_VERSION` |
| **API 契约** | srcPost 写入路径见 `packages/plugin-config/override-paths.ts` |
| **静态 sync** | hash 变更后 `pnpm sync:mengtu-static`，拒绝 HTML 伪装成 JS |

### 4.3 共用

| 规则 | 说明 |
|------|------|
| **server.ts 薄** | 新路由按域拆到 `master/` 或 `mengtu-api.ts` |
| **seed 数据** | 演示/菜单模板放 `data/admin-seed/`，用 `readSeed()` 读 |
| **类型复用** | 配置类型用 `@wechathook/shared`，op 解析用 `@wechathook/plugin-config` |
| **HTTPS** | 反代后 `config.js` 须认 `X-Forwarded-Proto`（已在 mengtu-ui.ts） |

---

## 5. UI 复用清单

| 需求 | 复用什么 | 不要 |
|------|----------|------|
| 总控表格/卡片 | `console.css` 现有 `.card` `.table` 类 | 内联 style |
| 总控 API 调用 | `app.js` 内 `api()` 封装 | 每页 fetch 重复写 header |
| 总代表单保存 | `POST /api/Agent/srcPost` | 直写文件绕过 API |
| 总代读配置 | `POST /api/Agent/srcGet` | 硬编码 form 字段 |
| 菜单结构 | `data/admin-seed/agent-menus-full.json` + `store.filterMenuTree` | 在 JS 里写死菜单 |
| 群授权 | `config/groups/*.yaml` + `master/store` | 多处重复 yaml 逻辑 |

---

## 5.1 总控 CSS 变量与组件类（`public/console/console.css`）

### Design Tokens（`:root`）

| 变量 | 用途 | 示例值 |
|------|------|--------|
| `--primary` | 主色（橙） | `#ff9f43` |
| `--primary-dark` | 标题/强调 | `#e8590c` |
| `--primary-light` | 浅底/输入框背景 | `#fff4e6` |
| `--accent` | 辅色（绿） | `#51cf66` |
| `--accent-dark` | 链接/成功强调 | `#37b24d` |
| `--accent-light` | 成功浅底 | `#ebfbee` |
| `--ok` / `--bad` / `--warn` | 状态色 | 绿/红/橙 |
| `--text` / `--text-secondary` | 正文/次要文字 | |
| `--border` / `--border-muted` | 边框 | |
| `--bg` / `--card` | 页面底/卡片底 | |
| `--surface-muted` / `--surface-disabled` | 灰底/禁用底 | |
| `--radius` / `--radius-sm` | 圆角 | `14px` / `10px` |
| `--shadow` / `--shadow-hover` | 卡片阴影 | |
| `--sidebar-w` / `--header-h` | PC 侧栏宽/顶栏高 | `240px` / `56px` |

**规则：** 新样式只用上表变量；语义化状态用 `.ok` `.bad` `.warn` 修饰类，不写裸 `#e67700`。

### 组件类（直接复用）

| 类名 | 场景 |
|------|------|
| `.page-login` / `.login-card` | 登录页 |
| `.page-app` / `.sidebar` / `.tabbar--mobile` | 主壳（H5 Tab + PC 侧栏） |
| `.page-header` / `.page-body` | 内页标题与内容区 |
| `.stat-grid` + `.stat-card` | 仪表盘数字卡片 |
| `.mod-grid` + `.mod-card` | 功能入口宫格 |
| `.card` + `.cell` | 列表/键值对 |
| `.group-card` / `.group-overview` | 群授权页 |
| `.agent-cred-list` | 总代/群表格列表 |
| `.btn-primary` / `.btn-block` / `.btn-outline` | 按钮 |
| `.switch` | 开关 |
| `.toast` | 轻提示 |

### 废弃目录

`public/agent/` 已归档至 [`_archive/deprecated/admin-agent-spa/`](../../_archive/deprecated/admin-agent-spa/DEPRECATED.md)，目录内仅留占位 README。

---

## 6. 验证（B-Admin 交卷前）

```powershell
pnpm sync:mengtu-static          # 若动过萌兔静态
pnpm --filter @wechathook/admin build
pnpm e2e:admin-ui                # 总控
pnpm e2e:sign-alignment          # 总代 → bot（本地或云 ADMIN_URL）
$env:ADMIN_URL="https://admin.sc5.top"; pnpm e2e:cloud   # 云探针
```

---

## 7. 推荐重构顺序（可选，按里程碑做）

1. ~~**文档 + Cursor 规则**~~ ✅
2. **console/app.js 模块化** — 按 `page-registry` 拆成 IIFE 或 ES module 文件后打包
3. ~~**console 设计 token**~~ ✅ 变量表 + 组件类文档（见 §5.1）
4. **providers 接口化** — `buildXxx()` 签名进 `providers/types.ts`
5. **总代 op 模板** — 复制 sign 端到端模式到 menu / welcome

---

## 8. B-Admin 新会话 Prompt

```
wechathook B-Admin。先读：
- docs/development/admin-ui-architecture.md
- docs/development/contracts/admin-bot.md
- docs/development/CURRENT.md

任务：[具体功能，例如「总控群列表页 tier=live」]

约束：
- 总控只改 public/console/ + master/ + providers/
- 总代不改萌兔 bundle，只改 mengtu-api / mengtu-ui / adaptive
- 禁止扩展 `public/agent/`（见 `_archive/deprecated/admin-agent-spa/`）
- 改完跑 e2e:admin-ui 或 e2e:sign-alignment

交卷：handoff-template.md
```

---

## 9. 与集成层关系

| 文档 | 作用 |
|------|------|
| [contracts/admin-bot.md](./contracts/admin-bot.md) | admin ↔ bot 数据契约 |
| [integration-workflow.md](./integration-workflow.md) | Git 合并闸门 |
| `.cursor/rules/wechathook-admin.mdc` | Agent 自动约束 |

架构变更（新增顶层目录、改挂载方式）须先更新 **本文** + **Cursor 规则**，再走 G-Integration 合并。
