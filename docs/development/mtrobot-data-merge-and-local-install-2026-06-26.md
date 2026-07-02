# 萌兔数据合并对照 + 本地客户端安装基线

**日期：** 2026-06-26  
**状态：** Phase 1 完成（静态 + 未登录运行态）；Phase 2 待登录微信后补采

---

## 1. 背景

- **云端 H5/API 归档：** `reference/mtrobot-agent-portal/`（脚本批量同步）
- **用户桌面抓取：** `C:\Users\along\Desktop\mengtu\`（浏览器/DevTools，2026-06-26）
- **本地客户端新装：** `D:\Mtrobot\`（MTRobot 1.1.4，2026-06-26 安装并启动，**尚未在萌兔内登录微信**）

此前本地萌兔客户端曾**残缺**；`D:\Mtrobot` 为完整重装，可作为 Phase 2 动态分析基准。

---

## 2. 桌面抓取（mengtu） vs 脚本归档（reference）

### 2.1 定位

| 维度 | `Desktop\mengtu` | `reference/mtrobot-agent-portal` |
|------|------------------|----------------------------------|
| 采集方式 | 浏览器/DevTools，跟真实操作 | Node 脚本批量同步 |
| API 样本 | **78** 端点 | **155+** JSON（含群级） |
| `Agent/srcGet` | **12** op（点过的页） | **77** op 全量 |
| 写接口 | **有**（~15 个） | **刻意不采** |
| 页面快照 | **36** HTML | 无 |
| 群级覆盖 | 无 | **30 群** × srcGet |
| 插件目录 | `menus_full.json` | `plugin-catalog.json`（107） |
| 人类文档 | `API数据结构深度报告.md` | `FULL-ANALYSIS.md` 等 |

**结论：互补。** 规格全量靠 reference；真实写接口、Help/notice、SuperBaby、页面 UI 靠 mengtu。

### 2.2 用户侧独有（建议合并进 reference）

| 优先级 | 文件 | 价值 |
|--------|------|------|
| P0 | `Help_notice.json` | 主人指令列表（我们脚本曾 `error is exist`） |
| P0 | `Baby_getList.json` / `Baby_wish.json` / `Baby_spirit.json` | SuperBaby 结构（我们 getList 曾失败） |
| P1 | `API数据结构深度报告.md` | 78 端点可读索引 |
| P1 | `menus_full.json` | 完整 Agent 菜单树 |
| P2 | 写接口 JSON | Mock 用，仅本地 + gitignore |
| P2 | `pages/*.html` | UI 对照 |

### 2.3 我们独有

- 77 个 `Agent/srcGet` 配置 schema
- 30 群 `GroupCenterSrc/srcGet` 覆盖
- `plugin-catalog.json`、`proxy-api-params.json`
- 带 `{type: dc|box|edge}` 的 `user.proxy/nodes` 成功样本

### 2.4 一致 / 都空

- `Agent/srcGet` **不带 `op`** → 失败
- `sever/index` → 空列表
- `user.auth/index` → 空列表
- `user.proxy/nodes` **无 type 参数** → 双方都失败

重叠的 12 个 srcGet（如 `sign`）表单结构与我们归档**一致**。

---

## 3. `D:\Mtrobot` 新安装 — Phase 1 基线（未登录微信）

### 3.1 完整性：与 1.1.4 规范一致 ✅

```
D:\Mtrobot\
├── rabbitrobat.exe          # Tauri 壳 ~24MB，字符串含 1.1.4
├── uninstall.exe
├── icons\
└── system\
    ├── rabbitr.dll          # Hook + HttpGateway ~8.6MB
    ├── wxserver.dll         # Go 协议层 ~53MB
    └── winwchat\            # .NET 8 WeChat.Api 栈
        ├── WeChat.Api.exe
        ├── WeChat.Core.dll  # ~16MB
        ├── redis\redis-server.exe
        └── wwwroot\index.html → Swagger
```

与 `docs/development/mtrobot-case-study.md` 描述的 **1.1.4 重本地栈** 一致，**非残缺包**。

| 组件 | 路径 | 大小 | 时间戳 |
|------|------|------|--------|
| `rabbitrobat.exe` | 根目录 | 23.9 MB | 2026-06-06 |
| `rabbitr.dll` | system | 8.6 MB | 2026-05-22 |
| `wxserver.dll` | system | 53.6 MB | 2026-06-04 |
| `WeChat.Api.exe` | winwchat | 0.14 MB | 2026-05-29 |
| `WeChat.Core.dll` | winwchat | 16.1 MB | 2026-05-29 |

**二进制字符串（rabbitrobat.exe）：**

- 版本：`1.1.4`
- 云端：`api.wxmtu.com`、`devapi.wxmtu.com`
- 本地：`127.0.0.1:61108`（rabbitr 网关）
- 签名头：`X-MTRobot-Signature`、`X-MTRobot-Timestamp`、`MTRobot.Winwchat.Api.Signature.2026.3`

### 3.2 Phase 1 运行态（2026-06-26 实测）

| 进程/端口 | 状态 | 说明 |
|-----------|------|------|
| `rabbitrobat.exe` | ✅ 运行中 | PID 示例 72852 |
| `127.0.0.1:61108` | ✅ LISTEN | 绑在 rabbitrobat 上 |
| `WeChat.Api.exe` | ❌ 未启动 | `:5000` 无响应 |
| `redis-server.exe` | ❌ 未启动 | `:6379` 无监听 |
| `wxserver.dll` | ❌ 未独立进程 | 预计登录后由壳加载 |
| `winwchat\logs\` | ❌ 尚未生成 | 登录/API 启动后才有 |
| Swagger | ❌ 不可达 | 依赖 WeChat.Api |

**推断：** 萌兔采用「壳先起 → 61108 就绪 → **登录微信后**再拉起 WeChat.Api + Redis + wxserver + 注入」。

### 3.3 与 wechathook 并存注意

同机实测另有：

- `:8787` — wechathook gateway
- `:19088` — Hook 4.1.8.27 API

系统里已有多个 `Weixin.exe`（多开）。**在萌兔内登录/注入前**，建议：

1. 明确要用哪一套（萌兔 `rabbitr.dll` ≠ wechathook `libGLESv1.dll`）
2. 避免对同一微信进程双 inject
3. Phase 2 分析时记录萌兔拉起的微信路径与版本号

---

## 4. Phase 2 待办（登录微信后）

登录完成后应二次采集：

| 项 | 方法 |
|----|------|
| 子进程树 | `rabbitrobat` → WeChat.Api / redis / Weixin |
| 监听端口 | 5000、6379、2025、61108 |
| Swagger | `http://127.0.0.1:5000/swagger/index.html` |
| 日志 | `D:\Mtrobot\system\winwchat\logs\` |
| 运行时数据 | SQLite / Redis dump 路径（登录后搜索 `*.db`） |
| 回调链 | `recvMsg` 目标 URL（默认 `:5000/api/recvMsg`） |
| 云端链路 | wxserver → `api.wxmtu.com` 或 `113.44.162.180:5001` |
| 微信版本 | 萌兔配套 Weixin 版本（非下载包内误放的 3.9 安装包） |

---

## 5. 分析顺序建议

**推荐两阶段，不必等登录也能先做 Phase 1（已完成）。**

1. **现在（Phase 1）** — 安装完整性、二进制版本、未登录端口/进程 ✅  
2. **你登录微信后（Phase 2）** — 动态栈、Swagger、日志、inject、消息流  

Phase 2 请在萌兔里完成扫码/登录后告知，再跑端口/进程/日志/Swagger 一轮。

---

## 6. 相关路径

```
D:\Mtrobot\                                    # 本地客户端（live）
C:\Users\along\Desktop\mengtu\                 # 用户 H5 抓包
d:\wechathook\reference\mtrobot-agent-portal\    # 云端归档
d:\wechathook\docs\development\mtrobot-case-study.md
```

**文档版本：** 1.0
