from pathlib import Path

# 数据库
DEFAULT_USER_ID = "local-user"
PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DATABASE_PATH = PROJECT_ROOT / "data" / "app.db"
DATABASE_URL = f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
