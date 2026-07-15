# 技能页面实现计划

> **给 agentic worker 的说明：** 执行本计划时需要使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐步实现。步骤使用 checkbox（`- [ ]`）跟踪进度。

**目标：** 实现独立的技能管理页面，让学生可以维护不强制关联经历的 `Skill` 事实。

**架构：** 前端继续保持轻量，不引入路由库；用当前导航状态在“画像库”和“技能”之间切换。复用后端接口：`GET /skills`、`POST /skills`、`PUT /skills/{id}`。`Skill` 当前只维护 `category` 和 `description`，不保存经历关联。

**技术栈：** React 18、Vite、TypeScript、Testing Library、Vitest、FastAPI、SQLAlchemy、SQLite。

## 全局约束

- 技能是独立事实库，不必须关联经历。
- 技能字段为分类和描述；分类作为标签展示，不作为目录树。
- 正常浏览时只显示列表；新增和编辑通过弹窗完成。
- 列表项中技能描述显示在上方，使用黑色正文；分类标签显示在下方。
- 当前默认写入的数据都是真实可信事实，本阶段不做写入信任校验。
- 不做岗位、JD、匹配和简历生成。
- 使用 TDD：先写失败的行为测试，再写生产代码。

---

### 任务 1：技能页面行为测试

**文件：**
- 修改：`apps/web/src/App.test.tsx`

**接口：**
- 消费：浏览器 `fetch`。
- 产出：对技能列表、新增、编辑保存行为的前端契约。

- [ ] **步骤 1：写失败测试**

新增测试：渲染 `App` 后点击“技能”导航，加载 `/skills`，列表中展示已有技能。断言列表项中描述在分类之前，描述使用黑色正文样式，分类作为标签显示。点击列表项打开编辑弹窗，通过 `PUT /skills/{id}` 保存 `category` 和 `description`；再点击 `+` 新增技能，通过 `POST /skills` 保存，断言请求体只包含 `category` 和 `description`，不包含 `experience_ids`。

- [ ] **步骤 2：运行测试并确认失败**

运行：`pnpm test`

预期：失败，因为当前应用还没有符合新展示顺序和弹窗编辑契约的技能页面。

### 任务 2：技能 API 客户端和页面

**文件：**
- 新建：`apps/web/src/api/skills.ts`
- 修改：`apps/web/src/App.tsx`
- 修改：`apps/web/src/styles/global.css`

**接口：**
- `Skill` 与后端响应字段保持一致。
- `listSkills(): Promise<Skill[]>`
- `createSkill(payload: SkillPayload): Promise<Skill>`
- `updateSkill(id: number, payload: SkillPayload): Promise<Skill>`

- [ ] **步骤 1：实现 API helper**

创建技能 fetch 客户端，默认使用 `import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"`。类型定义为：

- `id: number`
- `category: string | null`
- `description: string`

- [ ] **步骤 2：实现页面切换和表单**

新增“技能”导航项；主区域在该页显示扁平技能列表和加号按钮。列表项上方显示黑色描述，下方显示分类标签。点击列表项打开编辑弹窗，点击加号打开新增弹窗；弹窗只包含分类和技能描述两个字段，以及保存、取消操作。

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
