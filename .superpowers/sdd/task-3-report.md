# Task 3 Report

## RED

- 新增 `apps/web/src/api/jobs.test.ts`，覆盖 9 个客户端 API 的路径、方法、请求体、无 body POST、204 DELETE 和非 2xx 错误。
- 运行 `node_modules/.bin/vitest.cmd run src/api/jobs.test.ts --no-cache`。
- 结果：失败于 `Failed to resolve import "./jobs"`，测试文件被收集但功能模块尚不存在，符合预期 RED。

## GREEN

- 新增 `apps/web/src/api/jobs.ts`。
- 定义 `JobPosting`、`JobPostingCreatePayload`、`JobPostingUpdatePayload`、`JDAnalysis`、`JDAnalysisUpdatePayload`。
- 实现 jobs 与 JD analyses 的列表、创建、读取、更新、删除客户端方法。
- 统一使用现有 `VITE_API_BASE_URL` 默认值、JSON 请求头和状态码错误格式；204 响应直接返回，不调用 `response.json()`。
- 运行 `node_modules/.bin/vitest.cmd run src/api/jobs.test.ts --no-cache`：7/7 测试通过。

## 全测与构建

- `node_modules/.bin/vitest.cmd run --no-cache`：2 个测试文件、10/10 测试通过。
- `npm.cmd run build`：TypeScript 检查和 Vite 生产构建成功。
- `git diff --check`：通过。

## 文件

- `apps/web/src/api/jobs.ts`
- `apps/web/src/api/jobs.test.ts`
- `.superpowers/sdd/task-3-report.md`

## 自审

- API 路径与后端 router 一致：`/jobs`、`/jobs/:id`、`/jobs/:id/jd-analyses`、`/jd-analyses/:id`。
- `createJDAnalysis` 使用无 body 的 POST；`deleteJob` 正确处理 204。
- 非 2xx 响应抛出包含状态码的 `Error`。
- 未修改 App、UI 或后端；工作区没有其他既有改动需要保留或合并。
- 环境顾虑：PowerShell 直接执行 `npm run build` 受 `npm.ps1` 执行策略限制，改用等价的 `npm.cmd run build` 完成构建验证。

## Task 3 审查修复

### RED

- 在修改生产类型前，追加了最小创建测试：`createJob({ raw_jd_text: "JD" })`。
- 追加了八个 `JDAnalysisUpdatePayload` 字段全部为 `null` 的 PUT 请求体测试。
- 运行 `node_modules/.bin/tsc.cmd -b`，预期失败且实际失败：最小创建 payload 缺少 `status`、`location`、`title`、`company` 等字段；八个 nullable 字段均被原类型拒绝 `null`。

### GREEN

- `JobPostingCreatePayload` 改为仅 `raw_jd_text` 必填，其余后端创建字段 optional。
- `JDAnalysisUpdatePayload` 的八个字段均改为 optional，并分别允许 `null`。
- 运行 `node_modules/.bin/tsc.cmd -b`：通过。
- 运行 `node_modules/.bin/vitest.cmd run src/api/jobs.test.ts --no-cache`：1 个文件、9/9 测试通过。

### 全测与构建

- `node_modules/.bin/vitest.cmd run --no-cache`：2 个测试文件、12/12 测试通过。
- `npm.cmd run build`：TypeScript 检查和 Vite 生产构建成功。

### 修复自审

- 创建 payload 与后端 `JobPostingCreate` 的必填约束一致：只有 `raw_jd_text` 必填。
- 分析更新 payload 与后端 `JDAnalysisUpdate` 的八个可选且可空字段一致。
- 新增测试同时检查 TypeScript 可编译性、运行结果和实际 JSON 请求体。
- 本次只修改 `apps/web/src/api/jobs.ts`、`apps/web/src/api/jobs.test.ts` 和本报告，未修改 App/UI/后端。
