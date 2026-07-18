# 本地 Web App 实现计划

## 目标

基于 `docs/superpowers/specs/2026-07-10-job-agent-design.md`，实现一个本地运行的学生求职 Agent Web App MVP。第一阶段先跑通核心数据闭环：

`画像库 -> JDAnalysis -> MatchReport -> ResumeVersion -> ApplicationRecord`

第一版先使用规则逻辑和 mock agent 输出打通产品流程，保留后续接入真实大模型、Word/PDF 导出和半自动投递助手的接口。

## 技术栈

### 前端

- React + Vite + TypeScript。
- React Router 管理页面。
- TanStack Query 管理接口请求和缓存。
- Zustand 管理轻量本地 UI 状态。
- CSS Modules 或普通 CSS，先不引入重型 UI 框架。

### 后端

- FastAPI + Python。
- SQLAlchemy 2.x 管理 ORM。
- Alembic 管理数据库迁移。
- Pydantic 管理请求和响应 schema。
- SQLite 作为本地数据库。

### 本地运行形态

- 前端 dev server：`localhost:5173`。
- 后端 API server：`localhost:8000`。
- 数据库默认路径：项目内 `data/app.db`，后续可由 `AppConfig` 配置。

### 导出与 Agent

- Markdown 作为简历版本的主存储格式。
- Word/PDF 导出先设计服务接口，第一版可先实现 Markdown 下载；后续接入 docx/pdf 渲染。
- Agent 能力先通过可替换服务层实现：
  - 第一阶段使用 mock/rule-based 输出。
  - 后续替换为真实 LLM 调用，不改变 API 和数据流。

## 目录结构

```text
.
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── core/
│   │   │   ├── db/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   └── routers/
│   │   ├── alembic/
│   │   ├── tests/
│   │   └── pyproject.toml
│   └── web/
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   ├── features/
│       │   ├── layouts/
│       │   ├── pages/
│       │   └── styles/
│       ├── package.json
│       └── vite.config.ts
├── data/
├── docs/
└── README.md
```

## 数据建模阶段

### 数据表

实现以下核心表，所有业务表预留 `user_id`：

- `student_profiles`
- `student_preferences`
- `experiences`
- `skills`
- `job_postings`
- `jd_analyses`
- `match_reports`
- `resume_versions`
- `application_records`
- `app_configs`

### 关系原则

- `JobPosting` 保存原始 JD 文本。
- `JDAnalysis` 关联 `JobPosting`，作为结构化岗位分析。
- `MatchReport` 关联 `JDAnalysis`，通过 `JDAnalysis` 追溯岗位。
- `MatchReport` 中的 `Experience` / `Skill` 表示候选或推荐选材。
- `ResumeVersion` 关联 `MatchReport`，其中的 `Experience` / `Skill` 表示该版本实际采用的内容。
- `ApplicationRecord` 关联 `JobPosting` 和 `ResumeVersion`。
- `StudentPreference` 通过 `user_id` 归属用户，不强制关联 `StudentProfile`。

### 多值字段处理

第一版对以下字段使用 JSON 存储，后续需要复杂查询时再拆中间表：

- 目标城市。
- 目标岗位方向。
- 目标行业。
- 不接受城市/行业/岗位类型。
- `MatchReport` 的候选 `Experience` / `Skill` ID 列表。
- `ResumeVersion` 的实际使用 `Experience` / `Skill` ID 列表。

## API 阶段

### 画像 API

- `GET /profiles/current`
- `PUT /profiles/current`
- `GET /preferences/current`
- `PUT /preferences/current`
- `GET /experiences`
- `POST /experiences`
- `GET /experiences/{id}`
- `PUT /experiences/{id}`
- `DELETE /experiences/{id}`
- `GET /skills`
- `POST /skills`
- `PUT /skills/{id}`

### 岗位与 JD API

- `GET /jobs`
- `POST /jobs`
- `GET /jobs/{id}`
- `PUT /jobs/{id}`
- `POST /jobs/{id}/jd-analyses`
- `GET /jobs/{id}/jd-analyses`
- `GET /jd-analyses/{analysis_id}`

### 匹配与简历 API

- `POST /jd-analyses/{id}/match`
- `GET /match-reports/{id}`
- `POST /match-reports/{id}/resume-versions`
- `GET /resume-versions`
- `GET /resume-versions/{id}`
- `PUT /resume-versions/{id}`
- `POST /resume-versions/{id}/export`

### 投递与配置 API

- `GET /applications`
- `POST /applications`
- `PUT /applications/{id}`
- `GET /app-config`
- `PUT /app-config`

## 前端阶段

### 应用壳

实现工作台基本布局：

- 左侧导航：岗位、画像库、简历版本、投递清单、配置。
- 主内容区根据路由切换页面。
- 右侧 Agent 面板作为可复用组件，根据当前页面上下文显示不同提示。

### 画像库页面

优先实现此页面，因为它是事实库入口：

- 左侧经历列表。
- 列表顶部 `+` 新增经历按钮。
- 点击经历后，右侧显示详情表单。
- 右侧下方或侧边显示绑定当前经历的 Agent 对话占位区。
- 支持创建、编辑、保存经历。
- 支持查看/维护技能。

### 岗位页面

- 左侧岗位列表。
- 支持粘贴 JD 创建岗位。
- 支持点击岗位查看详情。
- 支持触发 JD 分析。
- 展示结构化 `JDAnalysis`。

### 匹配与简历页面

- 在岗位详情中触发匹配。
- 展示 `MatchReport`：匹配分、候选经历、候选技能、缺口、风险、简历策略。
- 从 `MatchReport` 生成 `ResumeVersion`。
- Markdown 编辑和预览。
- 展示本版简历实际采用的经历和技能。

### 投递清单页面

- 展示岗位、简历版本、投递状态、投递时间、结果。
- 支持创建和更新投递记录。
- 不实现自动投递。

### 配置页面

- 简历模板。
- 导出格式偏好，当前只支持 Markdown。
- 模型供应商和模型配置占位。
- 数据目录展示。
- 不配置下载路径，由浏览器决定 Markdown 的保存位置。

## Agent 服务阶段

第一版实现 mock/rule-based 服务：

- `analyze_jd(job_posting)`：从 JD 文本中抽取简单关键词、职责、要求，生成 `JDAnalysis`。
- `create_match_report(jd_analysis)`：基于关键词和技能名称做基础匹配，生成候选 `Experience` 和 `Skill`。
- `create_resume_version(match_report)`：根据候选内容生成 Markdown 简历草稿。
- `suggest_experience_questions(experience)`：根据经历字段缺失情况生成追问建议。

后续接入 LLM 时替换 services 内部实现，不改 API。

## 测试计划

### 后端测试

- 迁移能创建全部核心表。
- 所有表包含 `user_id`。
- `JDAnalysis -> JobPosting` 可追溯。
- `MatchReport -> JDAnalysis -> JobPosting` 可追溯。
- `ResumeVersion -> MatchReport` 可追溯。
- `ApplicationRecord` 同时关联 `JobPosting` 和 `ResumeVersion`。
- 简历生成服务不读取 `JobPosting` 和 `JDAnalysis`，只读取 `MatchReport`、`Experience`、`Skill`。
- mock JD 分析、匹配、简历生成可跑通。

### 前端测试

- 画像库可新增、选择、编辑经历。
- 岗位页可创建岗位并触发 JD 分析。
- 匹配报告可生成并展示候选经历/技能。
- 简历版本可生成、编辑、预览。
- 投递记录可创建和更新。

## 开发阶段划分

### 阶段 1：项目骨架

- 初始化 `apps/api` FastAPI 项目。
- 初始化 `apps/web` React/Vite 项目。
- 添加基础 README 和本地启动说明。
- 建立 API 健康检查和前端空工作台。

验收：

- 后端 `/health` 返回正常。
- 前端能打开本地工作台页面。

### 阶段 2：数据库与基础 CRUD

- 建 SQLAlchemy models。
- 建 Alembic migration。
- 实现 profile、preference、experience、skill evidence 的 CRUD。
- 添加后端测试。

验收：

- 测试数据库能创建全部表。
- 画像库核心 CRUD 测试通过。

### 阶段 3：画像库 UI

- 实现四栏工作台基础布局。
- 实现画像库左侧经历列表和右侧详情。
- 实现新增经历 `+` 流程。
- 实现技能维护入口。

验收：

- 用户能在 UI 中新增、选择、编辑经历。
- 当前经历 Agent 占位区能显示追问建议。

### 阶段 4：岗位与 JD 分析

- 实现岗位 CRUD。
- 实现 mock JD 分析服务。
- 实现岗位页和 JDAnalysis 展示。

验收：

- 用户能粘贴 JD 创建岗位。
- 用户能生成并查看结构化 JDAnalysis。

### 阶段 5：匹配与简历版本

- 实现 MatchReport 生成。
- 实现 ResumeVersion 生成。
- 实现 Markdown 编辑和预览。
- 明确候选内容和实际使用内容的区别。

验收：

- 用户能从岗位生成匹配报告。
- 用户能从匹配报告生成简历版本。
- 简历版本记录实际使用的 Experience/Skill ID。

### 阶段 6：投递、Markdown 下载与配置（已完成）

- 实现 ApplicationRecord。
- 实现投递清单页面。
- 实现从数据库已保存内容即时生成的 Markdown 浏览器下载。
- 实现 AppConfig 页面。

验收：

- 用户能把岗位和简历版本加入投递清单。
- 用户能更新投递状态和结果。
- AppConfig 能保存模板、Markdown 格式偏好、模型占位和隐私配置。
- 浏览器决定下载路径，应用不暴露或使用输出路径配置。

## 风险与取舍

- 先用 JSON 存储多值字段，减少早期 schema 复杂度；如果后续需要复杂筛选，再拆中间表。
- 先用 mock agent，优先验证数据流和交互；真实 LLM 接入放到核心闭环之后。
- 先实现 Markdown 生成，Word/PDF 导出后置，避免排版问题拖慢 MVP。
- 本地优先意味着先不做登录，但所有业务表保留 `user_id`，避免未来改造成本过高。

## 第一步实施建议

从阶段 1 开始：初始化前后端项目骨架、健康检查、空工作台和基础启动脚本。完成后再进入数据库建模。
