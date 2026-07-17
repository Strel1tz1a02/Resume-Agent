from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.jobs import router as jobs_router
from app.routers.matches import router as matches_router
from app.routers.profile import router as profile_router
from app.routers.resumes import router as resumes_router

app = FastAPI(title="Resume Agent API")

# 前后端链接件，因为前后端IP:PORT不同，需要连接
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],# 允许哪些网站访问
    allow_credentials=True, #是否允许：Cookie，Authorization，Session
    allow_methods=["*"],# 允许哪些 HTTP 方法
    allow_headers=["*"],# 允许哪些 Header
)

app.include_router(profile_router)# 路由可以拆到不同文件，最后在入口注册
app.include_router(jobs_router)
app.include_router(matches_router)
app.include_router(resumes_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "resume-agent-api",
    }
