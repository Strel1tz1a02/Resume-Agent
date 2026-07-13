from pydantic import BaseModel, ConfigDict, Field
# 定义数据进出 API 时长什么样、是否合法。

class StudentProfilePayload(BaseModel):
    name: str | None = None
    school: str | None = None
    major: str | None = None
    degree: str | None = None
    graduation_date: str | None = None
    language_ability: str | None = None


class StudentProfileRead(StudentProfilePayload):
    model_config = ConfigDict(from_attributes=True)

    id: int


class StudentPreferencePayload(BaseModel):
    target_cities: list[str] = Field(default_factory=list)
    target_roles: list[str] = Field(default_factory=list)
    target_industries: list[str] = Field(default_factory=list)
    excluded_cities: list[str] = Field(default_factory=list)
    excluded_industries: list[str] = Field(default_factory=list)
    excluded_role_types: list[str] = Field(default_factory=list)
    expected_job_types: list[str] = Field(default_factory=list)
    salary_expectation: str | None = None


class StudentPreferenceRead(StudentPreferencePayload):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ExperienceCreate(BaseModel):
    type: str
    name: str
    start_date: str | None = None
    end_date: str | None = None
    organization: str | None = None
    role: str | None = None
    background: str | None = None
    task_content: str | None = None
    result: str | None = None
    metrics: str | None = None


class ExperienceUpdate(BaseModel):
    type: str | None = None
    name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    organization: str | None = None
    role: str | None = None
    background: str | None = None
    task_content: str | None = None
    result: str | None = None
    metrics: str | None = None


class ExperienceRead(ExperienceCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class SkillEvidenceCreate(BaseModel):
    skill_name: str
    proficiency: str | None = None
    experience_ids: list[int] = Field(default_factory=list)
    evidence_summary: str | None = None
    outcome: str | None = None


class SkillEvidenceUpdate(BaseModel):
    skill_name: str | None = None
    proficiency: str | None = None
    experience_ids: list[int] | None = None
    evidence_summary: str | None = None
    outcome: str | None = None


class SkillEvidenceRead(SkillEvidenceCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
