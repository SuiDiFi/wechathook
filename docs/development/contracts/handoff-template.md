# 窗口交卷模板

功能窗口完成一个里程碑后，将以下内容复制到 **G-Integration** 会话或 `CURRENT.md` §交卷区。

---

```markdown
## 交卷 · [A-Cloud|B-Admin|C-Local|D-DevOps] · YYYY-MM-DD

### 目标
（本窗口本次要完成什么）

### 改动文件
- path/to/file.ts — 简述

### 契约影响
- [ ] 无 API/路径/配置优先级变更
- [ ] 有变更 → 已更新 docs/development/contracts/*.md

### 验证命令
pnpm --filter @wechathook/xxx build
pnpm e2e:xxx
（粘贴实际输出摘要）

### 未做 / 阻塞
- ...

### 需要其他窗口
- B-Admin 需配合：...
```

---

## 集成会话收到交卷后

1. `git fetch` + review diff  
2. 跑 CURRENT.md §7 集成闸门  
3. 更新 `CURRENT.md` §已完成 / §待办，清空 §交卷区  
4. merge 或指导 rebase 解决冲突
