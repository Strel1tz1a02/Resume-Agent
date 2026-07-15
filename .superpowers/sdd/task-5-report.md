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

## P1 Concurrency Fixes

### RED/GREEN

1. RED: A 的历史请求处于 deferred 状态时切换 A -> B -> A 并完成重新分析，旧 A 响应仍可因相同 `jobId` 覆盖重新分析得到的新历史。
   GREEN: `loadAnalyses` 为每个岗位捕获递增 history epoch；只有当前岗位和当前 epoch 同时匹配时才写入。重新分析成功后递增该岗位 epoch，使所有更早历史请求失效。
2. RED: 保存分析后切换到另一版本时，旧请求的 `finally` 不再满足分析 ID 条件，导致保存按钮永久显示“保存中”。
   GREEN: 版本切换立即解除旧保存态；`finally` 仅当请求仍是最新保存请求时才更新保存态，因此旧请求不会干扰更新后的请求。
3. RED: 保存分析后切换版本再切回并编辑草稿，旧保存响应仍会满足相同岗位和分析 ID 条件，从而覆盖新草稿。
   GREEN: 保存响应回写必须同时匹配岗位 ID、分析 ID、保存请求序号和草稿 revision；版本切换或任意草稿编辑都会使旧响应失去资格。

### Verification

- Focused: `npx.cmd vitest run --no-cache src/features/jobs/JobsPage.test.tsx` passed (19 tests).
- Full: `npx.cmd vitest run --no-cache` passed (3 files, 31 tests).
- Build: `npm.cmd run build` passed.

### Self Review

- history epoch 使用每岗位 Map，避免 A 的重新分析意外作废 B 的历史加载。
- 保存状态的释放与数据回写分离：前者以最新保存请求为准，后者要求完整的岗位、版本、请求和 revision 资格。
- 三个 deferred 回归覆盖旧同岗位历史覆盖、跨版本保存状态卡住，以及切回原版本后的旧响应覆盖草稿。

## P1 Save Bucket Isolation Follow-up

### RED/GREEN

1. RED: A save remained deferred, then saving B incremented the single global
   `analysisSaveRequestRef`. Returning to A made its otherwise valid response
   fail the request-token eligibility check, so A never synchronized.
   GREEN: save tokens are now stored in a `Map` keyed by `jobId:analysisId`.
   The deferred A -> B -> A -> A resolves regression proves A synchronizes
   after B saves.
2. RED: one global draft revision and saving flag allowed activity in B to
   invalidate or change the visible state for A.
   GREEN: draft revisions and active save requests are keyed by the same
   analysis key. Selecting an analysis derives its saving state from that
   analysis bucket; completion only clears the currently displayed matching
   bucket.

### Verification

- Focused: `npm.cmd test -- --no-cache src/features/jobs/JobsPage.test.tsx`
  passed (20 tests).
- Full: `npm.cmd test -- --no-cache` passed (3 files, 32 tests).
- Build: `npm.cmd run build` passed.
- `git diff --check` completed without whitespace errors.

### Self Review

- The save eligibility check requires the matching job, analysis, per-analysis
  request token, and per-analysis draft revision before it writes a response.
- Switching to B cannot clear A's active save, and A's completion cannot clear
  B's visible save state.
- The implementation and regression are limited to the Task 5 jobs page and
  its test; this report records the follow-up fix.
