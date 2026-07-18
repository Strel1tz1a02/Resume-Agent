from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


ApplicationStatus = Literal[
    "preparing",
    "applied",
    "written_test",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
]


class ApplicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_posting_id: int
    resume_version_id: int
    status: ApplicationStatus = "preparing"
    applied_at: str | None = None
    result: str | None = None


class ApplicationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ApplicationStatus
    applied_at: str | None = None
    result: str | None = None


class ApplicationRead(BaseModel):
    id: int
    job_posting_id: int
    resume_version_id: int
    status: ApplicationStatus
    applied_at: str | None
    result: str | None
    created_at: datetime
    updated_at: datetime
    job_company: str | None
    job_title: str | None
    resume_version_label: str
