# 学生求职 Agent

本项目是一个本地运行的学生求职 Agent Web App。当前已完成本地 Web App 骨架和基础数据层：

- 后端 FastAPI 服务。
- 前端 React/Vite 工作台壳。
- 后端 `/health` 健康检查。
- 前端左侧导航、主工作区、右侧 Agent 面板占位。
- SQLite + SQLAlchemy + Alembic 本地数据库。
- 学生画像、求职偏好、经历库、技能的基础 CRUD API。
- 技能独立于经历保存，当前字段为分类和描述；前端列表中描述在上方、分类标签在下方，新增和编辑通过弹窗完成。
- 岗位工作台支持粘贴 JD 创建岗位、编辑岗位信息，并自动生成结构化 JD 分析。
- JD 分析当前使用本地确定性规则，支持人工编辑、保留历史版本和重新分析；后续可替换为 LLM 服务。

## 目录

```text
apps/
  api/   FastAPI 后端
  web/   React/Vite 前端
docs/
  superpowers/specs/   产品设计文档
  superpowers/plans/   实现计划
```

## 后端本地运行

后端使用 Anaconda 环境 `resume-agent`。

首次运行或数据库结构更新后，先执行迁移：

```powershell
conda activate resume-agent
cd apps/api
python -m alembic -c alembic.ini upgrade head
```

已有本地数据库也必须执行上述命令，将岗位当前分析指针升级为 `current_jd_analysis_id`。

本地数据库默认写入项目根目录下的 `data/app.db`。

```powershell
conda activate resume-agent
cd apps/api
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

健康检查：

```powershell
curl http://127.0.0.1:8000/health
```

预期返回：

```json
{"status":"ok","service":"resume-agent-api"}
```

## 后端测试

```powershell
conda activate resume-agent
cd apps/api
python -m pytest -q
```

当前 API：

- `GET /health`
- `GET /profiles/current`
- `PUT /profiles/current`
- `GET /preferences/current`
- `PUT /preferences/current`
- `GET /experiences`
- `POST /experiences`
- `GET /experiences/{experience_id}`
- `PUT /experiences/{experience_id}`
- `DELETE /experiences/{experience_id}`
- `GET /skills`
- `POST /skills`
- `PUT /skills/{skill_id}`
- `GET /jobs`
- `POST /jobs`
- `GET /jobs/{job_id}`
- `PUT /jobs/{job_id}`
- `DELETE /jobs/{job_id}`
- `POST /jobs/{job_id}/jd-analyses`
- `GET /jobs/{job_id}/jd-analyses`
- `GET /jd-analyses/{analysis_id}`
- `PUT /jd-analyses/{analysis_id}`

## 岗位与 JD 分析工作流

1. 在“岗位”页面点击 `+`，粘贴 JD 原文；公司、岗位名称和地点可以同时人工修正。
2. 保存后系统先创建 `JobPosting`，再自动创建一条结构化 `JDAnalysis`。
3. 如果分析失败，岗位仍会保留，可以点击“重新分析”重试。
4. 岗位详情和分析结果都可以人工编辑；分析列表字段采用每行一项的形式。
5. 重新分析会创建新的历史记录，并把 `JobPosting.current_jd_analysis_id` 更新为最新分析；旧版本仍可查看。

当前规则分析只识别少量显式标签和关键词，用于跑通数据流，不承担复杂语义判断。

## 前端本地运行

前端环境由本机 Node/pnpm 配置。

```powershell
cd apps/web
pnpm install
pnpm dev
```

如果 `pnpm install` 提示 `Ignored build scripts: esbuild`，运行：

```powershell
pnpm approve-builds
```

默认地址：

```text
http://localhost:5173
```

前端验证：

```powershell
pnpm test
pnpm build
```
