# Task 4 Report: 岗位工作台基础流程

## RED/GREEN

1. RED: `JobsPage.test.tsx` 首次执行失败，原因是 `JobsPage` 尚不存在。
   GREEN: 新增页面后，岗位加载、默认选择和切换详情测试通过。
2. RED: 新增岗位测试找不到新增弹窗中的 `JD 原文`。
   GREEN: 实现创建弹窗，并验证 `createJob` 在 `createJDAnalysis(savedJob.id)` 之前调用，成功后显示完整只读分析。
3. RED: JD 分析接口失败产生未处理拒绝，且没有失败提示。
   GREEN: 已创建岗位保留、显示 `JD 分析失败` 和 `重新分析`，重试后显示分析结果。
4. RED: 岗位详情缺少地点等字段且没有保存行为。
   GREEN: `JobPosting` 的全部可编辑字段均在详情表单中显示，保存发送 `PUT /jobs/:id` 并反馈结果。
5. RED: App 岗位导航仍显示占位页。
   GREEN: 导航挂载 `JobsPage`，岗位页显示“岗位与 JD 分析”和阶段 4，并展示岗位 Agent 上下文。
6. RED: 分析面板未显示职责字段。
   GREEN: 分析对象的七个只读分类字段均以网格形式显示。

## Verification

- Focused: `npx.cmd vitest run --no-cache src/features/jobs/JobsPage.test.tsx` passed (5 tests).
- Full: `npx.cmd vitest run --no-cache` passed (3 files, 17 tests).
- Build: `npm.cmd run build` passed.

## Self Review

- `JobsPage` 独立管理岗位、草稿、创建、保存和分析状态；`App` 只负责岗位导航和页面挂载。
- 创建流程严格串行，分析失败不会回滚已创建岗位；分析仅展示，不包含 Task 5 的编辑或历史版本选择。
- 修改范围限于任务指定的前端文件和本报告；既有画像与技能流程未改动。
- 复用现有 8px 圆角、面板、表单和响应式断点；移动端将岗位布局和分析网格收敛为单列。
- 构建期间发现分析分类字面量被推断为联合数组，已通过显式元组类型修正，并在最终全量测试与 build 中验证。

## Review Fixes: Async Races And Loading Recovery

### RED/GREEN

1. RED: 延迟 A 的保存响应后切换到 B，A 的响应覆盖了 B 草稿；下一次对 `/jobs/8` 的保存实际发送了 A 的 payload。
   GREEN: 保存操作固定请求时的岗位 ID 与 payload，并且仅在该岗位仍被选中时回写详情草稿与成功提示。
2. RED: A 的 JD 分析请求尚未返回时切换到 B，A 的成功结果会显示在 B 的详情中；A 的失败也会在 B 中显示 `JD 分析失败` 和重试按钮。
   GREEN: 分析请求固定岗位 ID，成功、失败和加载状态只在该岗位仍为当前选择时回写；岗位列表的分析 ID 仍可安全更新。
3. RED: `listJobs` 返回失败响应时产生未处理 rejection，页面没有 `岗位加载失败` 或重试入口。
   GREEN: `loadJobs` 捕获失败并显示中文错误与 `重试` 按钮，重试成功后恢复岗位列表与详情。

### Verification

- Focused: `npx.cmd vitest run --no-cache src/features/jobs/JobsPage.test.tsx` passed (9 tests).
- Full: `npx.cmd vitest run --no-cache` passed (3 files, 21 tests).
- Build: `npm.cmd run build` passed.

### Self Review

- 保存回调不会再根据过期闭包覆盖新选择的草稿，也不会将旧岗位 payload 写入新岗位。
- 两个 deferred 分析测试分别覆盖 A 成功与失败在切换到 B 后均不可见。
- 加载异常不再逃逸为未处理 rejection；重试复用同一个受控加载路径。

## Review Fix: Late Save Failure

### RED/GREEN

1. RED: A 的保存请求处于 deferred 状态时切换到 B，随后拒绝 A；无条件的 `setSaveError` 会在 B 的详情中显示 `岗位保存失败`。
   GREEN: 保存失败提示与成功草稿回写一样，以 captured `jobId` 对照 `selectedIdRef.current`；只有请求所属岗位仍被选中时才显示错误。

### Verification

- Focused: `npx.cmd vitest run --no-cache src/features/jobs/JobsPage.test.tsx` passed (10 tests).
- Full: `npx.cmd vitest run --no-cache` passed (3 files, 22 tests).
- Build: `npm.cmd run build` passed.

### Self Review

- deferred rejection 回归测试明确覆盖 A 保存失败、切换到 B、错误消息不可见的完整时序。
- 本次仅隔离异步错误提示回写，未改变保存请求、草稿或分析行为。
