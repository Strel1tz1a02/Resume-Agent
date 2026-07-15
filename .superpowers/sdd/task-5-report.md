# Task 5 Report: 分析编辑、历史切换和重新分析

## RED/GREEN

1. RED: 新增的分析历史用例找不到“分析版本”控件，也没有可编辑字段、保存入口或重新分析确认流程。
   GREEN: 选中岗位后读取 `listJDAnalyses(jobId)`；优先显示 `current_jd_analysis_id`，没有匹配项时显示按接口顺序返回的最新版本。
2. RED: 历史版本无法切换、编辑和保存。
   GREEN: 七个数组字段使用逐行 textarea，完整性状态使用 `complete/incomplete` select；保存时拆分换行、trim 并过滤空行，调用 `updateJDAnalysis` 后同步草稿和历史列表。
3. RED: 重新分析没有确认，也无法保证成功后刷新职位与版本历史，失败时会丢失原结果。
   GREEN: `window.confirm` 确认后创建分析；成功后重新读取职位和历史并选中新版本，失败只显示错误并保留原分析和当前指针。
4. RED: A 岗位的延迟历史响应可在切换到 B 后覆盖 B 的分析界面。
   GREEN: 历史加载、分析保存和重新分析的界面回写均检查请求捕获的岗位 ID；分析保存还检查分析 ID。Task 4 的岗位保存状态也在切换岗位时隔离，避免旧请求禁用 B 的保存按钮。

## Verification

- Focused: `npx.cmd vitest run --no-cache src/features/jobs/JobsPage.test.tsx` passed (16 tests).
- Full: `npx.cmd vitest run --no-cache` passed (3 files, 28 tests).
- Build: `npm.cmd run build` passed.
- `git diff --check` completed without whitespace errors.

## Self Review

- 修改范围仅限 `JobsPage.tsx`、`JobsPage.test.tsx`、`global.css` 和本报告；未修改后端、`App` 或其他页面。
- 版本切换与历史保存不调用任何岗位更新接口，因此不会修改 `current_jd_analysis_id`。
- 前端 API 定义只有七个数组型分析字段，连同完整性状态构成全部八个可编辑分析字段；未扩展后端契约。
- 测试覆盖默认/回退选择、历史切换不改指针、换行规范化保存、重新分析成功刷新、失败保留原结果，以及迟到历史响应隔离。
