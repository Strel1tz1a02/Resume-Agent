# 技能证据页面实现计划

> **给 agentic worker 的说明：** 执行本计划时需要使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐步实现。步骤使用 checkbox（`- [ ]`）跟踪进度。

**目标：** 实现独立的技能证据管理页面，让学生可以维护不强制关联经历的 `SkillEvidence` 事实。

**架构：** 前端继续保持轻量，不引入路由库；用当前导航状态在“画像库”和“技能证据”之间切换。复用阶段二已有后端接口：`GET /skill-evidences`、`POST /skill-evidences`、`PUT /skill-evidences/{id}`。`experience_ids` 在 UI 中作为可选逗号分隔输入，留空时保存为空数组。

**技术栈：** React 18、Vite、TypeScript、Testing Library、Vitest、FastAPI、SQLAlchemy、SQLite。

## 全局约束

- 技能证据是独立事实库，不必须关联经历。
- 当前默认写入的数据都是真实可信事实，本阶段不做写入信任校验。
- 不修改数据库 schema。
- 不做岗位、JD、匹配和简历生成。
- 使用 TDD：先写失败的行为测试，再写生产代码。

---

### 任务 1：技能证据页面行为测试

**文件：**
- 修改：`apps/web/src/App.test.tsx`

**接口：**
- 消费：浏览器 `fetch`。
- 产出：对技能证据列表、新增、编辑保存行为的前端契约。

- [ ] **步骤 1：写失败测试**

新增测试：渲染 `App` 后点击“技能证据”导航，加载 `/skill-evidences`，选择已有技能证据，编辑成果并通过 `PUT /skill-evidences/{id}` 保存；再点击 `+` 新增一条无关联经历的技能证据，通过 `POST /skill-evidences` 保存，断言请求体包含 `experience_ids: []`。

- [ ] **步骤 2：运行测试并确认失败**

运行：`pnpm test`

预期：失败，因为当前应用还没有独立技能证据页面。

### 任务 2：技能证据 API 客户端和页面

**文件：**
- 新建：`apps/web/src/api/skillEvidences.ts`
- 修改：`apps/web/src/App.tsx`
- 修改：`apps/web/src/styles/global.css`

**接口：**
- `SkillEvidence` 与后端响应字段保持一致。
- `listSkillEvidences(): Promise<SkillEvidence[]>`
- `createSkillEvidence(payload: SkillEvidencePayload): Promise<SkillEvidence>`
- `updateSkillEvidence(id: number, payload: SkillEvidencePayload): Promise<SkillEvidence>`

- [ ] **步骤 1：实现 API helper**

创建技能证据 fetch 客户端，默认使用 `import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"`。

- [ ] **步骤 2：实现页面切换和表单**

新增“技能证据”导航项；主区域在该页显示技能证据列表、加号按钮、详情表单、保存按钮和 Agent 说明。`experience_ids` 输入为空时保存 `[]`，输入 `1, 2` 时保存 `[1, 2]`。

- [ ] **步骤 3：运行前端测试并确认通过**

运行：`pnpm test`

预期：通过。

### 任务 3：验证和提交

- [ ] **步骤 1：运行后端测试**

在 `apps/api` 目录运行：`python -m pytest -q`

预期：所有后端测试通过。

- [ ] **步骤 2：运行前端构建**

在 `apps/web` 目录运行：`pnpm build`

预期：TypeScript 和 Vite 构建通过。

- [ ] **步骤 3：提交**

运行：

```powershell
git add docs/superpowers/plans/2026-07-15-skill-evidence-page-plan.md apps/web/src
git commit -m "Build skill evidence page"
```
