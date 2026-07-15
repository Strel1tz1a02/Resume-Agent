# 画像库 UI 实现计划

> **给 agentic worker 的说明：** 执行本计划时需要使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐步实现。步骤使用 checkbox（`- [ ]`）跟踪进度。

**目标：** 实现画像库 UI，让学生可以从本地 FastAPI 后端加载、选择、新增和编辑经历。

**架构：** 本阶段保持轻量：React 前端使用一个小型 `fetch` 封装和组件本地状态，不提前引入路由或请求缓存库。复用阶段二已有的后端 API，不修改数据库 schema。右侧 Agent 面板根据当前选中的经历生成占位追问建议。

**技术栈：** React 18、Vite、TypeScript、Testing Library、Vitest、FastAPI、SQLAlchemy、SQLite。

## 全局约束

- 应用本地优先，目标用户是学生求职者。
- 画像库是长期事实库，不能每个岗位都重新画像。
- 后续简历生成必须使用结构化分析和事实记录，不能直接读取 JD 原文。
- 本阶段范围只包含画像库 UI；岗位、JD、匹配和简历生成留到后续阶段。
- 使用 TDD：先写失败的行为测试，再写生产代码。

---

### 任务 1：画像库行为测试

**文件：**
- 修改：`apps/web/src/App.test.tsx`

**接口：**
- 消费：浏览器 `fetch`。
- 产出：对 `GET /experiences`、`POST /experiences`、`PUT /experiences/{id}` 的前端使用契约。

- [ ] **步骤 1：写失败测试**

把原来的应用壳测试替换为画像库行为测试：mock `fetch`，渲染 `App`，验证中文画像库布局，选择已加载经历，通过 `+` 创建草稿，编辑字段，并通过预期 API 调用保存。

- [ ] **步骤 2：运行测试并确认失败**

运行：`pnpm test`

预期：失败，因为当前应用还没有渲染画像库控件。

### 任务 2：API 客户端和画像库 UI

**文件：**
- 新建：`apps/web/src/api/experiences.ts`
- 替换：`apps/web/src/App.tsx`
- 替换：`apps/web/src/styles/global.css`

**接口：**
- `Experience` 与后端响应字段保持一致。
- `listExperiences(): Promise<Experience[]>`
- `createExperience(payload: ExperiencePayload): Promise<Experience>`
- `updateExperience(id: number, payload: ExperiencePayload): Promise<Experience>`

- [ ] **步骤 1：实现 API helper**

创建一个小型 fetch 客户端，默认使用 `import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"`。

- [ ] **步骤 2：实现页面**

渲染工作台外壳，使用正常中文文案；包含画像库导航项、经历列表、加号按钮、详情表单、保存按钮、技能占位区，以及随当前经历变化的 Agent 追问建议。

- [ ] **步骤 3：运行前端测试并确认通过**

运行：`pnpm test`

预期：通过。

### 任务 3：验证和提交

**文件：**
- 如本地运行说明需要更新，则修改 `README.md`。

- [ ] **步骤 1：运行后端测试**

在 `apps/api` 目录运行：`python -m pytest -q`

预期：所有后端测试通过。

- [ ] **步骤 2：运行前端构建**

在 `apps/web` 目录运行：`pnpm build`

预期：TypeScript 和 Vite 构建通过。

- [ ] **步骤 3：提交**

运行：

```powershell
git add docs/superpowers/plans/2026-07-14-profile-library-ui-plan.md apps/web/src
git commit -m "Build profile library UI"
```
