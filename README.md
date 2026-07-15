# 学生求职 Agent

本项目是一个本地运行的学生求职 Agent Web App。当前已完成本地 Web App 骨架和基础数据层：

- 后端 FastAPI 服务。
- 前端 React/Vite 工作台壳。
- 后端 `/health` 健康检查。
- 前端左侧导航、主工作区、右侧 Agent 面板占位。
- SQLite + SQLAlchemy + Alembic 本地数据库。
- 学生画像、求职偏好、经历库、技能的基础 CRUD API。
- 技能独立于经历保存，当前字段为分类和描述；前端列表中描述在上方、分类标签在下方，新增和编辑通过弹窗完成。

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
