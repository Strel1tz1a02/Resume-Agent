# 统一开发启动命令设计

## 目标

在项目根目录提供一个统一的开发命令，同时启动 FastAPI 后端和 Vite 前端。开发者只需执行 `pnpm dev`，即可在同一个终端中查看两个服务的日志，并通过一次 `Ctrl+C` 关闭全部服务。

## 方案

在项目根目录增加 Node 工作区配置和根 `package.json`，使用 `concurrently` 管理两个长期运行的子进程。

- API 子进程通过 `conda run --no-capture-output -n resume-agent python -m uvicorn app.main:app --app-dir apps/api --reload --host 127.0.0.1 --port 8000` 启动。`--no-capture-output` 保证日志实时显示，`--app-dir` 让 Uvicorn 从项目根目录定位后端包。
- Web 子进程通过 `pnpm --dir apps/web dev` 执行现有的前端命令，在 5173 端口启动 Vite。
- 根命令为两个进程添加 `api`、`web` 日志前缀。
- 其中一个进程异常退出时，终止另一个进程，避免遗留占用端口的服务。
- 用户按下 `Ctrl+C` 时，由 `concurrently` 统一转发终止信号并关闭两个子进程。

## 文件职责

- 根 `package.json`：定义统一的 `dev`、`dev:api` 和 `dev:web` 命令，并声明 `concurrently` 开发依赖。
- 根 `pnpm-workspace.yaml`：声明 `apps/web` 为 pnpm 工作区包，使依赖安装和命令入口保持统一。
- `README.md`：补充一键启动说明，同时保留分别启动前后端的故障排查方式。

## 运行流程

1. 用户在项目根目录运行 `pnpm install` 安装根开发依赖。
2. 用户运行 `pnpm dev`。
3. `concurrently` 创建 API 和 Web 两个子进程。
4. API 监听 `http://127.0.0.1:8000`，Web 监听 `http://127.0.0.1:5173`。
5. 两个服务的输出带不同前缀显示在当前终端。
6. 用户按一次 `Ctrl+C`，两个服务一同退出。

## 错误处理

- 如果 `resume-agent` Conda 环境不存在，API 子进程退出，统一命令随后关闭 Web 子进程，并在终端保留 Conda 错误信息。
- 如果 8000 或 5173 端口被占用，对应子进程退出，同时关闭另一服务，避免应用处于半启动状态。
- 不自动修改端口，因为前端默认 API 地址和后端 CORS 当前依赖固定端口；端口调整应作为显式配置处理。

## 验证

- 运行根目录 `pnpm dev`，确认终端同时出现 API 和 Web 启动日志。
- 请求 `http://127.0.0.1:8000/health`，确认后端健康检查成功。
- 打开 `http://127.0.0.1:5173`，确认画像库可以加载经历。
- 按下 `Ctrl+C`，确认 8000 和 5173 端口都不再监听。
- 继续运行现有后端测试、前端测试和前端构建，确认配置没有影响现有流程。

## 范围限制

本次只改善本地开发启动方式，不引入生产进程管理、Docker、自动打开浏览器、动态端口选择或服务自动重启策略。Uvicorn 和 Vite 已分别提供源码热重载能力。
