from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_USER_ID
from app.db.session import get_db
from app.models import ApplicationRecord, JobPosting, ResumeVersion
from app.schemas.applications import (
    ApplicationCreate,
    ApplicationRead,
    ApplicationUpdate,
)

router = APIRouter()


def _job_for_user(db: Session, job_id: int) -> JobPosting:
    job = db.scalar(
        select(JobPosting).where(
            JobPosting.id == job_id,
            JobPosting.user_id == DEFAULT_USER_ID,
        )
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _version_for_user(db: Session, version_id: int) -> ResumeVersion:
    version = db.scalar(
        select(ResumeVersion).where(
            ResumeVersion.id == version_id,
            ResumeVersion.user_id == DEFAULT_USER_ID,
        )
    )
    if version is None:
        raise HTTPException(status_code=404, detail="Resume version not found")
    return version


def _application_for_user(db: Session, application_id: int) -> ApplicationRecord:
    application = db.scalar(
        select(ApplicationRecord).where(
            ApplicationRecord.id == application_id,
            ApplicationRecord.user_id == DEFAULT_USER_ID,
        )
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


def _to_read(
    application: ApplicationRecord,
    job: JobPosting,
    version: ResumeVersion,
) -> ApplicationRead:
    return ApplicationRead(
        id=application.id,
        job_posting_id=application.job_posting_id,
        resume_version_id=application.resume_version_id,
        status=application.status or "preparing",
        applied_at=application.applied_at,
        result=application.result,
        created_at=application.created_at,
        updated_at=application.updated_at,
        job_company=job.company,
        job_title=job.title,
        resume_version_label=f"简历 #{version.id}",
    )


@router.get("/applications", response_model=list[ApplicationRead])
def list_applications(db: Session = Depends(get_db)) -> list[ApplicationRead]:
    applications = list(
        db.scalars(
            select(ApplicationRecord)
            .where(ApplicationRecord.user_id == DEFAULT_USER_ID)
            .order_by(ApplicationRecord.id.desc())
        )
    )
    return [
        _to_read(
            application,
            _job_for_user(db, application.job_posting_id),
            _version_for_user(db, application.resume_version_id),
        )
        for application in applications
    ]


@router.post(
    "/applications",
    response_model=ApplicationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
) -> ApplicationRead:
    job = _job_for_user(db, payload.job_posting_id)
    version = _version_for_user(db, payload.resume_version_id)
    if version.job_posting_id != job.id:
        raise HTTPException(
            status_code=422,
            detail="Resume version does not belong to job",
        )
    existing = db.scalar(
        select(ApplicationRecord).where(
            ApplicationRecord.user_id == DEFAULT_USER_ID,
            ApplicationRecord.job_posting_id == job.id,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Application already exists")

    application = ApplicationRecord(
        user_id=DEFAULT_USER_ID,
        **payload.model_dump(),
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return _to_read(application, job, version)


@router.put("/applications/{application_id}", response_model=ApplicationRead)
def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
) -> ApplicationRead:
    application = _application_for_user(db, application_id)
    for field, value in payload.model_dump().items():
        setattr(application, field, value)
    db.commit()
    db.refresh(application)
    return _to_read(
        application,
        _job_for_user(db, application.job_posting_id),
        _version_for_user(db, application.resume_version_id),
    )
