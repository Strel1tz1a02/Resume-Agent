from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_DATABASE_PATH, DEFAULT_USER_ID
from app.db.session import get_db
from app.models import AppConfig
from app.schemas.config import AppConfigRead, AppConfigWrite

router = APIRouter()


def _config_for_user(db: Session) -> AppConfig | None:
    return db.scalar(
        select(AppConfig).where(AppConfig.user_id == DEFAULT_USER_ID)
    )


def _default_config() -> AppConfigRead:
    return AppConfigRead(
        resume_template=None,
        preferred_export_formats=["markdown"],
        model_provider=None,
        provider_config={},
        language_preference="zh-CN",
        data_directory=str(DEFAULT_DATABASE_PATH.parent),
        privacy_settings={},
    )


def _to_read(config: AppConfig) -> AppConfigRead:
    return AppConfigRead(
        resume_template=config.resume_template,
        preferred_export_formats=config.preferred_export_formats,
        model_provider=config.model_provider,
        provider_config=config.model_config,
        language_preference=config.language_preference,
        data_directory=config.data_directory,
        privacy_settings=config.privacy_settings,
    )


@router.get("/app-config", response_model=AppConfigRead)
def get_app_config(db: Session = Depends(get_db)) -> AppConfigRead:
    config = _config_for_user(db)
    return _to_read(config) if config is not None else _default_config()


@router.put("/app-config", response_model=AppConfigRead)
def update_app_config(
    payload: AppConfigWrite,
    db: Session = Depends(get_db),
) -> AppConfigRead:
    config = _config_for_user(db)
    if config is None:
        config = AppConfig(user_id=DEFAULT_USER_ID)
        db.add(config)

    config.resume_template = payload.resume_template
    config.preferred_export_formats = payload.preferred_export_formats
    config.model_provider = payload.model_provider
    config.model_config = payload.provider_config
    config.language_preference = payload.language_preference
    config.data_directory = payload.data_directory
    config.privacy_settings = payload.privacy_settings
    db.commit()
    db.refresh(config)
    return _to_read(config)
