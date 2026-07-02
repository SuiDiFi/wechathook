# 萌兔总代后台 H5 归档

**来源：** [https://wx.wxmtu.com/agent](https://wx.wxmtu.com/agent)  
**API 基址：** `https://api.wxmtu.com/`  
**更新：** 运行 `node scripts/download-mtrobot-agent-portal.js`（凭据走环境变量）

## 目录说明

| 路径 | 内容 |
|------|------|
| `static/agent/` | H5 前端编译产物（HTML / JS / CSS / img） |
| `manifest.json` | 路由、API 路径、文件统计 |
| `routes.txt` | vue-router 路径列表 |
| `api-paths.txt` | 后端 API 路径列表 |
| `api-util-map.json` | 前端 `$ApiUtil` 模块与方法名 |
| `api-samples/full-sync/` | **全量只读同步**（77 配置页 + 平台 API） |
| `api-samples/full-sync/read-only-extra/` | **只读增量**（分页列表 + 未采样读接口 + 群级配置） |
| `proxy-api-params.json` | IP 代理页 API 参数格式（从 bundle 提取） |
| `api-samples/full-sync/read-only-extra/proxy/` | IP 代理只读补采结果 |
| `FULL-ANALYSIS.md` | 全量功能分析报告 |

## 全量同步

```powershell
$env:MTROBOT_AGENT_USER="88888"
$env:MTROBOT_AGENT_PASS="***"
node scripts/sync-mtrobot-agent-full.js
node scripts/extract-mtrobot-catalog.js

# 只读增量：未采样读接口 + 列表分页 + 群级 srcGet（不写后台）
node scripts/sync-mtrobot-readonly-extra.js

# IP 代理页补采（nodes 三类型 + index has:1 + 预览接口）
node scripts/sync-mtrobot-proxy-readonly.js
```

输出目录 `api-samples/full-sync/` 含敏感数据，已加入 `.gitignore`。

## 重要说明

1. 这是 **Vue SPA 打包后的单文件**（`js/app.*.js` ~950KB），不是 `.vue` 源码；「全部页面代码」= 整包 JS + CSS + 静态资源。
2. 登录凭据 **不要** 提交到 Git；使用 `MTROBOT_AGENT_USER` / `MTROBOT_AGENT_PASS` 环境变量。
3. 采样脚本 **仅调用读接口**，不会 POST 修改群配置、产品、激活码等。

## 登录接口（已从 bundle 确认）

```http
POST https://api.wxmtu.com/api/Agent/login
Content-Type: application/json
from: vh5

{"username":"88888","password":"***"}
```

响应成功：`status: 1`，`data.token` + `data.uid`  
请求头：`Authorization: Bearer {token}`，`token`，`uid`，`from: vh5`

**注意：** 真实路径带 `/api/` 前缀（bundle 中 `yu = window.g.site + 'api'`）。
