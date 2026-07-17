from dataclasses import asdict
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_USER_ID
from app.db.session import get_db
from app.models import (
    Experience,
    JDAnalysis,
    JobPosting,
    MatchReport,
    ResumeVersion,
    Skill,
)
from app.schemas.resumes import (
    ResumeVersionCreate,
    ResumeVersionRead,
    ResumeVersionUpdate,
)
from app.services.resume_placeholder import create_resume_markdown

router = APIRouter()


def _report_for_user(db: Session, report_id: int) -> MatchReport:
    report = db.scalar(
        select(MatchReport).where(
            MatchReport.id == report_id,
            MatchReport.user_id == DEFAULT_USER_ID,
        )
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Match report not found")
    return report


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


def _ordered_materials(
    db: Session,
    model: type[Experience] | type[Skill],
    ids: list[int],
) -> list[Experience] | list[Skill]:
    if not ids:
        return []
    items = list(
        db.scalars(
            select(model).where(
                model.id.in_(ids),
                model.user_id == DEFAULT_USER_ID,
            )
        )
    )
    by_id = {item.id: item for item in items}
    return [by_id[item_id] for item_id in ids if item_id in by_id]


def _job_for_report(db: Session, report: MatchReport) -> JobPosting:
    analysis = db.scalar(
        select(JDAnalysis).where(
            JDAnalysis.id == report.jd_analysis_id,
            JDAnalysis.user_id == DEFAULT_USER_ID,
        )
    )
    if analysis is None:
        raise HTTPException(status_code=404, detail="JD analysis not found")
    job = db.scalar(
        select(JobPosting).where(
            JobPosting.id == analysis.job_posting_id,
            JobPosting.user_id == DEFAULT_USER_ID,
        )
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _read_version(db: Session, version: ResumeVersion) -> ResumeVersionRead:
    job = db.scalar(
        select(JobPosting).where(
            JobPosting.id == version.job_posting_id,
            JobPosting.user_id == DEFAULT_USER_ID,
        )
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return ResumeVersionRead(
        id=version.id,
        job_posting_id=version.job_posting_id,
        match_report_id=version.match_report_id,
        markdown_content=version.markdown_content,
        used_experience_ids=version.used_experience_ids,
        used_skill_ids=version.used_skill_ids,
        generation_rationale=version.generation_rationale,
        manual_edit_history=version.manual_edit_history,
        created_at=version.created_at,
        updated_at=version.updated_at,
        job_company=job.company,
        job_title=job.title,
        used_experiences=_ordered_materials(
            db, Experience, version.used_experience_ids
        ),
        used_skills=_ordered_materials(db, Skill, version.used_skill_ids),
    )


def _validate_candidate_subset(selected: list[int], candidates: list[int]) -> None:
    if not set(selected).issubset(candidates):
        raise HTTPException(
            status_code=422,
            detail="Selected materials must be match report candidates",
        )


@router.post(
    "/match-reports/{report_id}/resume-versions",
    response_model=ResumeVersionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_resume_version(
    report_id: int,
    payload: ResumeVersionCreate,
    db: Session = Depends(get_db),
) -> ResumeVersionRead:
    report = _report_for_user(db, report_id)
    _validate_candidate_subset(
        payload.used_experience_ids, report.candidate_experience_ids
    )
    _validate_candidate_subset(payload.used_skill_ids, report.candidate_skill_ids)
    experiences = _ordered_materials(db, Experience, payload.used_experience_ids)
    skills = _ordered_materials(db, Skill, payload.used_skill_ids)
    if len(experiences) != len(payload.used_experience_ids):
        raise HTTPException(status_code=422, detail="Experience not found")
    if len(skills) != len(payload.used_skill_ids):
        raise HTTPException(status_code=422, detail="Skill not found")
    job = _job_for_report(db, report)
    generated = create_resume_markdown(report, experiences, skills)
    version = ResumeVersion(
        user_id=DEFAULT_USER_ID,
        job_posting_id=job.id,
        match_report_id=report.id,
        used_experience_ids=payload.used_experience_ids,
        used_skill_ids=payload.used_skill_ids,
        manual_edit_history=[],
        **asdict(generated),
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return _read_version(db, version)


@router.get("/resume-versions", response_model=list[ResumeVersionRead])
def list_resume_versions(
    db: Session = Depends(get_db),
) -> list[ResumeVersionRead]:
    versions = list(
        db.scalars(
            select(ResumeVersion)
            .where(ResumeVersion.user_id == DEFAULT_USER_ID)
            .order_by(ResumeVersion.id.desc())
        )
    )
    return [_read_version(db, version) for version in versions]


@router.get("/resume-versions/{version_id}", response_model=ResumeVersionRead)
def get_resume_version(
    version_id: int,
    db: Session = Depends(get_db),
) -> ResumeVersionRead:
    return _read_version(db, _version_for_user(db, version_id))


@router.put("/resume-versions/{version_id}", response_model=ResumeVersionRead)
def update_resume_version(
    version_id: int,
    payload: ResumeVersionUpdate,
    db: Session = Depends(get_db),
) -> ResumeVersionRead:
    version = _version_for_user(db, version_id)
    history = list(version.manual_edit_history)
    history.append(
        {
            "edited_at": datetime.now(UTC).isoformat(),
            "before_summary": version.markdown_content[:120],
            "after_summary": payload.markdown_content[:120],
        }
    )
    version.manual_edit_history = history
    version.markdown_content = payload.markdown_content
    db.commit()
    db.refresh(version)
    return _read_version(db, version)
