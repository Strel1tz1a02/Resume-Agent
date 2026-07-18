from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_DATABASE_PATH
from app.models import AppConfig


def _config_payload() -> dict:
    return {
        "resume_template": "student",
        "preferred_export_formats": ["markdown"],
        "model_provider": "placeholder",
        "model_config": {"model": "later"},
        "language_preference": "zh-CN",
        "data_directory": str(DEFAULT_DATABASE_PATH.parent),
        "privacy_settings": {"local_only": True},
    }


def test_app_config_returns_defaults_without_creating_record(
    client: TestClient,
    db_session: Session,
) -> None:
    response = client.get("/app-config")

    assert response.status_code == 200
    assert response.json() == {
        "resume_template": None,
        "preferred_export_formats": ["markdown"],
        "model_provider": None,
        "model_config": {},
        "language_preference": "zh-CN",
        "data_directory": str(DEFAULT_DATABASE_PATH.parent),
        "privacy_settings": {},
    }
    assert db_session.scalar(select(func.count(AppConfig.id))) == 0


def test_app_config_put_creates_then_updates_single_record(
    client: TestClient,
    db_session: Session,
) -> None:
    payload = _config_payload()

    created = client.put("/app-config", json=payload)
    updated = client.put(
        "/app-config",
        json={**payload, "resume_template": "compact"},
    )

    assert created.status_code == 200
    assert created.json() == payload
    assert updated.status_code == 200
    assert updated.json()["resume_template"] == "compact"
    assert updated.json()["model_config"] == {"model": "later"}
    assert db_session.scalar(select(func.count(AppConfig.id))) == 1


def test_app_config_rejects_output_path_bad_json_and_formats(
    client: TestClient,
) -> None:
    payload = _config_payload()

    output_path = client.put(
        "/app-config",
        json={**payload, "default_output_path": "D:/exports"},
    )
    array_model_config = client.put(
        "/app-config",
        json={**payload, "model_config": []},
    )
    array_privacy = client.put(
        "/app-config",
        json={**payload, "privacy_settings": []},
    )
    unsupported_format = client.put(
        "/app-config",
        json={**payload, "preferred_export_formats": ["pdf"]},
    )

    assert output_path.status_code == 422
    assert array_model_config.status_code == 422
    assert array_privacy.status_code == 422
    assert unsupported_format.status_code == 422


def test_app_config_does_not_expose_other_users_record(
    client: TestClient,
    db_session: Session,
) -> None:
    db_session.add(
        AppConfig(
            user_id="other-user",
            default_output_path="D:/private",
            resume_template="private",
            preferred_export_formats=["markdown"],
            model_provider="private",
            model_config={"secret": True},
            language_preference="en-US",
            data_directory="private-data",
            privacy_settings={"private": True},
        )
    )
    db_session.commit()

    response = client.get("/app-config")

    assert response.status_code == 200
    assert response.json()["resume_template"] is None
    assert response.json()["model_config"] == {}
    assert "default_output_path" not in response.json()

    saved = client.put("/app-config", json=_config_payload())
    assert saved.status_code == 200
    assert db_session.scalar(select(func.count(AppConfig.id))) == 2
