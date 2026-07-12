# 学生求职 Agent

本项目是一个本地运行的学生求职 Agent Web App。第一阶段目标是搭建最小可运行骨架：

- 后端 FastAPI 服务。
- 前端 React/Vite 工作台壳。
- 后端 `/health` 健康检查。
- 前端左侧导航、主工作区、右侧 Agent 面板占位。

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
python -m pytest tests/test_health.py -q
```

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
