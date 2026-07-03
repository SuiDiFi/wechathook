# 开发文档

微信群娱乐管理机器人（wechathook）开发者文档索引。

## 文档目录

| 文档 | 说明 |
|------|------|
| [**当前状态 CURRENT**](./CURRENT.md) | 多 Agent 集成会话必读：服务、分工、里程碑 |
| [**集成工作流**](./integration-workflow.md) | Git 分支 + 文档 + 契约测试汇总层 |
| [**Admin 双后台架构**](./admin-ui-architecture.md) | 总控/总代目录、UI 复用、B-Admin Agent 规范 |
| [**接口契约 contracts/**](./contracts/README.md) | admin↔bot、super API、配置优先级 |
| [架构概览](./architecture.md) | 分层设计、消息流、模块职责 |
| [快速上手](./getting-started.md) | 环境、构建、启动、联调 |
| [配置参考](./configuration.md) | `bot.yaml` 与按群配置 |
| [Hook 对接](./hook-integration.md) | Hook 4.1.8.27 入站/出站、inject |
| [插件开发](./plugin-development.md) | 热插拔插件接口、示例、最佳实践 |
| [存储 API](./storage-api.md) | SQLite 表结构与 `IStorage` 用法 |
| [测试与调试](./testing.md) | 本地模拟、日志、常见问题 |
| [云中继架构](./cloud-relay-architecture.md) | 本地 Relay ↔ 云端 Bot 拆分、协议对齐小微 V |
| [萌兔 MTRobot 案例分析](./mtrobot-case-study.md) | 本地+云端双栈对照（`D:\Mtrobot` 1.1.4 实装） |
| [萌兔数据合并 + 本地安装基线](./mtrobot-data-merge-and-local-install-2026-06-26.md) | mengtu 抓包 vs reference；`D:\Mtrobot` Phase 1/2 |
| [存档检查点 2026-06-25 v2](./archive-checkpoint-2026-06-25.md) | **历史冻结点** |
| [**MVP v1.0 运行手册**](./mvp-runbook.md) | 启动 bot-server / relay / admin / E2E / 云部署策略 |
| [**MVP v1.0 定义**](./mvp-v1.0.md) | 交付目标 + 多 Agent 分工 |
| [**萌兔同构主路线图 2026-06-26**](./roadmap-mengtu-parity-2026-06-26.md) | Phase 1–5 执行计划 |
| [**开发进度日志（勾选）**](../../ROADMAP-PROGRESS.md) | 路线图顺序 + 完成打钩 |
| [萌兔综合架构报告 2026-06-26](./mtrobot-comprehensive-architecture-report-2026-06-26.md) | 三层架构 + inject/win 实测 |
| [萌兔总代后台侦察](./mtrobot-cloud-agent-recon.md) | `wx.wxmtu.com/agent` + `api.wxmtu.com` 静态分析 |
| [萌兔 H5 本地归档](../../reference/mtrobot-agent-portal/ANALYSIS.md) | 已下载 bundle + 路由/API 全量清单 |
| [萌兔全量功能分析](../../reference/mtrobot-agent-portal/FULL-ANALYSIS.md) | 77 配置页 + 107 插件 ID 只读同步结论 |
| [proxy-api-params.json](../../reference/mtrobot-agent-portal/proxy-api-params.json) | IP 代理页 API 参数（从 bundle 提取） |

## 相关文档

- 项目根目录 [README.md](../README.md) — 用户向快速入门
- [Hook 4.1.8.27 对接说明](../hook-4.1.8.27.md) — inject 命令与端口说明

## 技术栈

- **运行时**：Node.js 20+
- **语言**：TypeScript（ESM）
- **包管理**：pnpm workspace monorepo
- **HTTP**：Hono + `@hono/node-server`
- **存储**：SQLite（better-sqlite3）
- **Hook**：个人微信 Hook 4.1.8.27（REST + HTTP 回调）

## 仓库结构

```
wechathook/
├── apps/gateway/           # 启动入口
├── packages/
│   ├── shared/             # 类型与接口契约
│   ├── hook-adapter/       # Hook 适配层
│   └── bot-core/           # 核心引擎（路由、插件、存储、Webhook）
├── plugins/                # 热插拔功能插件
├── config/                 # 运行时配置
├── docs/development/       # 本目录
└── scripts/                # inject、测试脚本
```

## 设计原则

1. **Hook 与应用解耦**：插件只依赖 `IHookClient`，不直接调用 Hook REST
2. **功能热插拔**：每个玩法独立目录 + `plugin.json` manifest
3. **事件标准化**：Hook 原始 JSON → `NormalizedMessage` / `MemberJoinEvent`
4. **按群可配置**：全局默认 + `config/groups/<roomId>.yaml` 覆盖

## 版本

当前文档对应项目版本 **0.1.0**（MVP 框架 + 示例插件骨架）。
