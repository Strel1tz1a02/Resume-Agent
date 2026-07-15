from pydantic import BaseModel, ConfigDict, Field


class JobPostingCreate(BaseModel):
    company: str | None = None
    title: str | None = None
    location: str | None = None
    source_url: str | None = None
    raw_jd_text: str = Field(min_length=1)
    published_at: str | None = None
    deadline: str | None = None
    job_type: str | None = None
    status: str | None = None
    notes: str | None = None


class JobPostingUpdate(BaseModel):
    company: str | None = None
    title: str | None = None
    location: str | None = None
    source_url: str | None = None
    raw_jd_text: str | None = None
    published_at: str | None = None
    deadline: str | None = None
    job_type: str | None = None
    status: str | None = None
    notes: str | None = None


class JobPostingRead(JobPostingCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    current_jd_analysis_id: int | None


class JDAnalysisUpdate(BaseModel):
    hard_requirements: list[str] | None = None
    bonus_requirements: list[str] | None = None
    keywords: list[str] | None = None
    responsibilities: list[str] | None = None
    capability_dimensions: list[str] | None = None
    risks: list[str] | None = None
    resume_emphasis: list[str] | None = None
    completeness_status: str | None = None


class JDAnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_posting_id: int
    hard_requirements: list[str]
    bonus_requirements: list[str]
    keywords: list[str]
    responsibilities: list[str]
    capability_dimensions: list[str]
    risks: list[str]
    resume_emphasis: list[str]
    completeness_status: str
