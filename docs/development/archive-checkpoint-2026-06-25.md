# 项目存档检查点 — 2026-06-25（v2）

本文档冻结当前阶段结论，便于梳理规划后开新会话续接，无需重读整段对话。

**用户状态（2026-06-25）：** 暂停实施，先梳理再做规划。二次开发方向已明确：以萌兔 **op 插件体系 + 动态配置 + 群覆盖** 为产品规格，在 wechathook 同构重写（非 fork 萌兔源码）。

---

## 1. 项目现状（wechathook）

| 项 | 状态 |
|----|------|
| 形态 | pnpm monorepo，本地 Gateway + 插件（路径 C） |
| Hook | Hook **4.1.8.27**，`libGLESv1.dll`，微信 **4.1.8.27** |
| Gateway | `http://127.0.0.1:8787`，`/api/recvMsg` |
| Hook API | `http://127.0.0.1:19088`（必须 **POST**） |
| 插件 | help / welcome / checkin / admin / game-stub |
| 已实现包 | `hook-adapter`、`bot-core`、`shared`、`apps/gateway` |
| **未开始** | `relay-protocol`、`bot-server`、`relay-client`、`plugin-config` |

**日常开发：** 改插件 / 重启 gateway **不需要** re-inject；inject 用 `scripts\inject-wechat.cmd`。

---

## 2. 萌兔总代后台 — 本地归档清单

**入口：** https://wx.wxmtu.com/agent  
**API：** https://api.wxmtu.com/api/  
**本地目录：** `reference/mtrobot-agent-portal/`

| 内容 | 路径 | 状态 |
|------|------|------|
| H5 编译产物 | `static/`（`app.d31f1d00.js` ~950KB） | ✅ |
| 路由 / API 清单 | `routes.txt`、`api-paths.txt` | ✅ |
| 总代默认配置 | `api-samples/full-sync/Agent/srcGet/` **77 op** | ✅ |
| 插件目录 | `plugin-catalog.json`（**107 ID**） | ✅ |
| 平台只读 API | `api-samples/full-sync/platform/` | ✅ 部分 |
| 群级覆盖 | `read-only-extra/groups/{group_id}/GroupCenterSrc_srcGet/` **30 群** | ✅ |
| 列表分页补采 | `read-only-extra/paginated/` | ✅ |
| IP 代理补采 | `read-only-extra/proxy/` + `proxy-api-params.json` | ✅ |
| 分析报告 | `FULL-ANALYSIS.md`、`ANALYSIS.md` | ✅ |

**敏感数据：** `api-samples/full-sync/`、`read-only-samples.json` 已加入 `reference/mtrobot-agent-portal/.gitignore`，勿提交公开仓库。

### 2.1 同步脚本

```powershell
$env:MTROBOT_AGENT_USER="88888"
$env:MTROBOT_AGENT_PASS="***"

node scripts/download-mtrobot-agent-portal.js   # 静态资源 + 基础采样
node scripts/sync-mtrobot-agent-full.js         # 77 srcGet + 平台 API
node scripts/extract-mtrobot-catalog.js         # plugin-catalog.json
node scripts/sync-mtrobot-readonly-extra.js     # 分页 + 群级 + 读接口（~10min）
node scripts/sync-mtrobot-proxy-readonly.js     # IP 代理 nodes 三类型
```

快捷模式：

```powershell
$env:READONLY_EXTRA_SINGLES_ONLY="1"            # 只补单次读接口
$env:READONLY_EXTRA_SKIP_GROUPS="1"             # 跳过群级拉取
node scripts/sync-mtrobot-readonly-extra.js
```

---

## 3. 归档完整度（供规划参考）

### 3.1 按「二次开发规格层」

| 层次 | 补全度 | 说明 |
|------|--------|------|
| 插件清单 / op 命名 | ~95% | catalog + 77 srcGet |
| 配置模型（表单 schema） | ~90% | switch_checked、message、tag |
| 群级覆盖模型 | ~85% | 30 群样本，非全量群 |
| 管理台 UI 源码 | 0% | 仅 minified bundle，宜参考不宜 fork |
| 玩法运行时逻辑 | ~10% | 需自研 plugins |
| Win/iPad/代理 API 契约 | ~40%～90% | Win/代理较全，iPad 实例空 |
| relay / rabbitr 协议 | ~0% | 未归档 |

### 3.2 按「页面本地 Mock 复现」（不涉及远程读写）

- 配置类页面（总代 + 群 + 代理）：**~90%** 可 Mock
- 账号/服务器/登录类：**~50%～60%**
- 整体加权：**~75%～85%**（需自建 Mock API 网关）

### 3.3 明确没有、也不应指望从归档拿到

- 萌兔云端后端源码（PHP 等）
- 107 插件的执行算法
- `srcPost` 服务端校验规则（未调用写接口）
- 本地 `rabbitr` / wxserver 联调协议

---

## 4. 萌兔逻辑框架（二次开发应对齐）

```
menus → agent-src-:op (动态表单)
         ↓
Agent/srcGet (总代默认) + GroupCenterSrc/srcGet (群覆盖)
         ↓
asetting.plug (107 插件总开关)
         ↓
运行时：关键词路由 → 插件 handler → Hook 发消息
```

**wechathook 推荐路线：** 规格驱动补全 → `plugin-config` + 配置驱动插件 → 猜题/经济引擎 → relay（可选）。

**建议实施波次（未开工）：**

1. **框架：** `plugin-config`、PluginRegistry 读 `switch_checked`、模板 tag 引擎  
2. **插件：** sign/welcome/menu 配置驱动；guess* 合并为 guess-engine  
3. **经济：** 金币/钻石（sign 模板变量已定义）  
4. **重玩法：** fish / farms / partner  
5. **SaaS（可选）：** Product/Codes、user.proxy  

---

## 5. 模块归档细项（Win / iPad / 代理 / 服务器）

| 模块 | 前端 bundle | 只读 API 样本 | 备注 |
|------|-------------|---------------|------|
| IP 代理 | ✅ | ✅ index/nodes/proxies/getPublicProxy | `proxy-api-params.json` 含写接口参数说明 |
| Win 登录 | ✅ | ✅ user.pc/index + servers | 4 实例有数据 |
| iPad 登录 | ✅ | ⚠️ user.auth/index 空；servers 池有 | 账号未开 iPad 实例 |
| Mac 登录 | ✅ | ⚠️ user.mac/index 空 | |
| 服务器 sever | ✅ | ⚠️ sever/index 空 | |
| 运行账号 | ✅ | ✅ Member/index | |

---

## 6. 三套参考系统（不变）

| 系统 | 与 wechathook |
|------|----------------|
| **小微 V** | 路径 A：薄 relay + 云端 bot |
| **萌兔 1.1.4** | 路径 B：重本地 + 云端 H5/API（**产品规格主参考**） |
| **如家** | 玩法边界 / 插件划分参考 |
| **wechathook** | 路径 C 当前：本地 gateway + plugins |

**共识：** 娱乐逻辑不在 Hook 里；上云后迁到 bot-server。萌兔归档用于 **配置框架对齐**，不是复制 wxserver。

---

## 7. 已拍板 / 暂停项

- [x] 萌兔总代 H5 + 77 srcGet + 107 插件目录归档  
- [x] 群级 srcGet（30 群）+ 只读分页补采  
- [x] IP 代理 nodes 参数提取 + 补采脚本  
- [ ] **用户梳理后的二次开发规划**（下一步）  
- [ ] `packages/plugin-config`  
- [ ] 配置驱动 sign/welcome  
- [ ] `relay-protocol` / `bot-server` / `relay-client`  
- [ ] 本地 Mock 管理台（可选）  

---

## 8. 文档与索引

| 文档 | 说明 |
|------|------|
| [FULL-ANALYSIS.md](../../reference/mtrobot-agent-portal/FULL-ANALYSIS.md) | 全量功能分析主文档 |
| [ANALYSIS.md](../../reference/mtrobot-agent-portal/ANALYSIS.md) | H5 归档说明 |
| [proxy-api-params.json](../../reference/mtrobot-agent-portal/proxy-api-params.json) | IP 代理 API 参数 |
| [cloud-relay-architecture.md](./cloud-relay-architecture.md) | 云中继目标架构 |
| [mtrobot-case-study.md](./mtrobot-case-study.md) | 萌兔本地栈案例 |
| [mtrobot-cloud-agent-recon.md](./mtrobot-cloud-agent-recon.md) | 总代后台侦察 |

---

## 9. 关键路径速查

```
# 启动 wechathook
cd d:\wechathook && pnpm start

# inject（管理员 CMD）
d:\wechathook\scripts\inject-wechat.cmd

# 健康检查
curl -s http://127.0.0.1:8787/health

# 萌兔归档根目录
d:\wechathook\reference\mtrobot-agent-portal\
```

---

## 10. 2026-06-26 增量

| 项 | 状态 |
|----|------|
| 用户桌面 H5 抓包 | `C:\Users\along\Desktop\mengtu\` — 78 API + 36 页面 + 深度报告 |
| 与 reference 对比 | 见 [mtrobot-data-merge-and-local-install-2026-06-26.md](./mtrobot-data-merge-and-local-install-2026-06-26.md) §2 |
| 本地客户端重装 | `D:\Mtrobot\` — MTRobot **1.1.4** 完整栈；Phase 1 基线已记录 |
| Phase 2 | 待用户在萌兔内**登录微信**后：Swagger / 日志 / inject / 消息流 |

---

**存档版本：** 2.1（+ mengtu 对比 + D:\Mtrobot 安装基线；Phase 2 待登录）
