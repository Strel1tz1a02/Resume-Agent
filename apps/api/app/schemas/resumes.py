from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.profile import ExperienceRead, SkillRead


class ResumeVersionCreate(BaseModel):
    used_experience_ids: list[int] = Field(default_factory=list)
    used_skill_ids: list[int] = Field(default_factory=list)

    @field_validator("used_experience_ids", "used_skill_ids")
    @classmethod
    def ids_must_be_unique(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("IDs must be unique")
        return value


class ResumeVersionUpdate(BaseModel):
    markdown_content: str


class ResumeVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_posting_id: int
    match_report_id: int
    markdown_content: str
    used_experience_ids: list[int]
    used_skill_ids: list[int]
    generation_rationale: str | None
    manual_edit_history: list[dict]
    created_at: datetime
    updated_at: datetime
    job_company: str | None
    job_title: str | None
    used_experiences: list[ExperienceRead]
    used_skills: list[SkillRead]
