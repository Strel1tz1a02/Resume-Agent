from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AppConfigWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    resume_template: str | None = None
    preferred_export_formats: list[Literal["markdown"]] = Field(
        default_factory=lambda: ["markdown"]
    )
    model_provider: str | None = None
    provider_config: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias="model_config",
        serialization_alias="model_config",
    )
    language_preference: str | None = "zh-CN"
    data_directory: str | None = None
    privacy_settings: dict[str, Any] = Field(default_factory=dict)


class AppConfigRead(AppConfigWrite):
    pass
