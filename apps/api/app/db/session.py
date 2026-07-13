from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import DATABASE_URL, DEFAULT_DATABASE_PATH

DEFAULT_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},# check_same_thread=False 允许在不同线程中使用同一个数据库连接，适用于 SQLite 数据库
)
# SessionLocal 是数据库会话工厂。
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# get_db() 每次请求产生一个 Session，请求完成后自动关闭。
def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
