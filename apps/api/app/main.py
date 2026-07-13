from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.profile import router as profile_router

app = FastAPI(title="Resume Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "resume-agent-api",
    }
