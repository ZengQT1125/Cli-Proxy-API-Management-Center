# GitHub Release

**Goal:** 从 `main` 当前已验证 revision 自动推断下一个语义版本，推送分支与 annotated Tag 触发 GitHub Actions 发布。
**Why planning is required:** 推送 Tag 会触发外部发布流程，属于 consequential external-state change。
**Acceptance:** 工作区在发布前保持干净；`origin`、分支和目标 revision 明确；版本只由最新远端 Tag 后的非 merge 提交推断；目标 Tag 不存在；测试、类型检查、lint 和构建对目标 revision 通过；分支与 Tag 推送成功且远端引用指向预期对象。禁止覆盖现有 Tag、force-push、pull、merge 或 rebase。若 Tag 仅在本地创建后推送失败，删除本地 Tag；若远端出现意外状态，立即停止并保留现场。

### Outcome 1: 确定发布版本与目标 revision
- Work: 获取 `origin` 最新分支与 Tag 引用，确认工作区、当前分支、HEAD、上一版本 Tag 和全部待发布非 merge 提交；按 Conventional Commits 语义取最高版本等级。
- Risks/open questions: 远端可能已有本地未见的 Tag；fetch 后必须重新计算，不能复用旧结果。
- Verify: `git status --porcelain && git log "${PREV_TAG}..HEAD" --no-merges --oneline`

### Outcome 2: 建立发布前证据
- Work: 对最终目标 revision 运行全量 Bun 测试、TypeScript 类型检查、ESLint 和生产构建；审查 warnings，确认没有本次变更引入的错误。
- Verify: `bun test && npm run type-check && npm run lint && npm run build`

### Outcome 3: 创建并交付 Release Tag
- Work: 确认目标 Tag 本地与远端均不存在，创建 annotated Tag；推送当前分支和 Tag；核对远端分支 SHA 与 peeled Tag SHA 均指向发布 revision。
- Risks/open questions: 分支推送与 Tag 推送可能部分成功；失败时不得自动改写历史或覆盖 Tag。
- Verify: `git ls-remote origin "refs/heads/${BRANCH}" "refs/tags/${NEW_TAG}" "refs/tags/${NEW_TAG}^{}"`
