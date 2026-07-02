# 集成工作流：Git + 文档 + 契约测试

多 Agent 窗口并行开发时的**汇总层**实施指南。

---

## 1. 三层汇总

```
┌─────────────────────────────────────────────────────────┐
│  Git（代码与分支 = 唯一合并真相）                          │
├─────────────────────────────────────────────────────────┤
│  文档（CURRENT.md + contracts/ = 跨窗口共识）              │
├─────────────────────────────────────────────────────────┤
│  契约测试（contracts/ + e2e:* = 自动化回归锚点）           │
└─────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
    各功能窗口交卷      集成会话维护         合并前必跑
```

---

## 2. Git 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 可运行、闸门全绿 |
| `integrate/*` | 集成会话临时合并区（可选） |
| `cloud/*` | A-Cloud：bot-server、plugins |
| `admin/*` | B-Admin：admin、plugin-config |
| `local/*` | C-Local：gateway、relay、hook |
| `ops/*` | D-DevOps：部署与配置 |

**规则：**

- 功能窗口只在自己的 `feature` 分支开发  
- 不直接在 `main` 上大改  
- 合并前 rebase 到最新 `main`  
- commit message 写「为什么」，例如：`fix(admin): reject HTML masquerading as mengtu JS bundle`

---

## 3. 文档维护节奏

| 时机 | 更新什么 |
|------|----------|
| 每个里程碑完成 | `CURRENT.md` §已完成 |
| 契约变更 | `contracts/*.md` + 对应测试脚本 |
| 架构决策 | 在 `contracts/` 或 `architecture.md` 追加 ADR 段落 |
| 集成合并后 | 清空 `CURRENT.md` §交卷区 |

**单一事实来源优先级：**  
`contracts/` > `CURRENT.md` > 会话记忆

---

## 4. 契约测试体系

### 4.1 静态契约（无需服务）

验证仓库结构与文档一致：

- 共享路径常量存在（`AGENT_OVERRIDES_DIR` 等）  
- 关键文件存在（sign 归档、群 yaml 样例）  
- package.json 脚本注册完整  

```powershell
pnpm contracts:static
```

### 4.2 运行时契约（需服务）

| 脚本 | 依赖 | 验证 |
|------|------|------|
| `e2e:mvp` | bot-server | super API 核心 |
| `e2e:sign-alignment` | admin + bot-server | admin-bot 契约 |
| `e2e:cloud` | admin + bot-server | admin 探针 bot |
| `e2e:admin-ui` | admin | 总控 UI |

```powershell
pnpm contracts:runtime   # 编排上述（服务离线则 SKIP）
pnpm contracts             # static + runtime
```

### 4.3 集成闸门（合并前）

见 [CURRENT.md §7](./CURRENT.md#7-集成闸门合并前必跑)

---

## 5. 推荐日常流程

### 功能窗口

1. 读 `CURRENT.md` + 对应契约  
2. 建分支 `cloud/sign-menu-engine`  
3. 开发 + 本地验证  
4. 填 [handoff-template.md](./contracts/handoff-template.md) 交卷  

### 集成窗口（本会话角色）

1. 收交卷 → review → merge  
2. `pnpm contracts && pnpm build`  
3. 更新 `CURRENT.md`  
4. 通知下一窗口依赖项  

---

## 6. 上云拆分（与窗口对应）

| 组件 | 首云阶段 | 窗口 |
|------|----------|------|
| bot-server + admin | VPS / Docker | D-DevOps 部署，A/B 保逻辑 |
| SQLite + overrides | 跟 bot-server 同机 | D-DevOps |
| relay-bridge / gateway | 本地 Windows | C-Local |
| rabbitr + Weixin | 本地 | C-Local |

本地 `config/bot.yaml` → `botServer.url` 指向云 URL 即可切换，无需拆 repo。

---

## 7. 相关文件

| 文件 | 说明 |
|------|------|
| [CURRENT.md](./CURRENT.md) | 实时状态 |
| [contracts/README.md](./contracts/README.md) | 契约索引 |
| [.cursor/rules/](../../.cursor/rules/) | Agent 边界规则 |
| [scripts/contracts/](../../scripts/contracts/) | 契约测试脚本 |
