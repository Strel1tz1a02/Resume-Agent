from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_USER_ID
from app.db.session import get_db
from app.models import JDAnalysis, JobPosting
from app.schemas.jobs import (
    JDAnalysisRead,
    JDAnalysisUpdate,
    JobPostingCreate,
    JobPostingRead,
    JobPostingUpdate,
)
from app.services.jd_rules import analyze_jd, extract_job_fields

router = APIRouter()


def _apply_updates(instance: object, values: dict) -> None:
    for key, value in values.items():
        setattr(instance, key, value)


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


def _analysis_for_user(db: Session, analysis_id: int) -> JDAnalysis:
    analysis = db.scalar(
        select(JDAnalysis).where(
            JDAnalysis.id == analysis_id,
            JDAnalysis.user_id == DEFAULT_USER_ID,
        )
    )
    if analysis is None:
        raise HTTPException(status_code=404, detail="JD analysis not found")
    return analysis


def _manual_or_extracted(value: str | None, extracted: str | None) -> str | None:
    return value if value not in (None, "") else extracted


@router.get("/jobs", response_model=list[JobPostingRead])
def list_jobs(db: Session = Depends(get_db)) -> list[JobPosting]:
    return list(
        db.scalars(
            select(JobPosting)
            .where(JobPosting.user_id == DEFAULT_USER_ID)
            .order_by(JobPosting.id)
        )
    )


@router.post(
    "/jobs",
    response_model=JobPostingRead,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    payload: JobPostingCreate,
    db: Session = Depends(get_db),
) -> JobPosting:
    extracted = extract_job_fields(payload.raw_jd_text)
    values = payload.model_dump()
    for field in ("company", "title", "location"):
        values[field] = _manual_or_extracted(values[field], getattr(extracted, field))

    job = JobPosting(user_id=DEFAULT_USER_ID, **values)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs/{job_id}", response_model=JobPostingRead)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobPosting:
    return _job_for_user(db, job_id)


@router.put("/jobs/{job_id}", response_model=JobPostingRead)
def update_job(
    job_id: int,
    payload: JobPostingUpdate,
    db: Session = Depends(get_db),
) -> JobPosting:
    job = _job_for_user(db, job_id)
    _apply_updates(job, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(job)
    return job


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: int, db: Session = Depends(get_db)) -> Response:
    job = _job_for_user(db, job_id)
    analyses = db.scalars(
        select(JDAnalysis).where(
            JDAnalysis.job_posting_id == job.id,
            JDAnalysis.user_id == DEFAULT_USER_ID,
        )
    )
    for analysis in analyses:
        db.delete(analysis)
    db.delete(job)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/jobs/{job_id}/jd-analyses",
    response_model=JDAnalysisRead,
    status_code=status.HTTP_201_CREATED,
)
def create_jd_analysis(
    job_id: int,
    db: Session = Depends(get_db),
) -> JDAnalysis:
    try:
        job = _job_for_user(db, job_id)
        if job.raw_jd_text is None or not job.raw_jd_text.strip():
            raise HTTPException(status_code=422, detail="Job description cannot be blank")

        analysis = JDAnalysis(
            user_id=DEFAULT_USER_ID,
            job_posting_id=job.id,
            **asdict(analyze_jd(job.raw_jd_text)),
        )
        db.add(analysis)
        db.flush()
        job.current_jd_analysis_id = analysis.id
        db.commit()
        db.refresh(analysis)
        return analysis
    except Exception:
        db.rollback()
        raise


@router.get("/jobs/{job_id}/jd-analyses", response_model=list[JDAnalysisRead])
def list_jd_analyses(
    job_id: int,
    db: Session = Depends(get_db),
) -> list[JDAnalysis]:
    job = _job_for_user(db, job_id)
    return list(
        db.scalars(
            select(JDAnalysis)
            .where(
                JDAnalysis.job_posting_id == job.id,
                JDAnalysis.user_id == DEFAULT_USER_ID,
            )
            .order_by(JDAnalysis.id.desc())
        )
    )


@router.get("/jd-analyses/{analysis_id}", response_model=JDAnalysisRead)
def get_jd_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
) -> JDAnalysis:
    return _analysis_for_user(db, analysis_id)


@router.put("/jd-analyses/{analysis_id}", response_model=JDAnalysisRead)
def update_jd_analysis(
    analysis_id: int,
    payload: JDAnalysisUpdate,
    db: Session = Depends(get_db),
) -> JDAnalysis:
    analysis = _analysis_for_user(db, analysis_id)
    _apply_updates(analysis, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(analysis)
    return analysis
