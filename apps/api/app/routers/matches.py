from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_USER_ID
from app.db.session import get_db
from app.models import Experience, JDAnalysis, MatchReport, Skill
from app.schemas.matches import MatchReportRead
from app.services.match_placeholder import create_match_placeholder

router = APIRouter()


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


def _read_report(db: Session, report: MatchReport) -> MatchReportRead:
    return MatchReportRead(
        id=report.id,
        jd_analysis_id=report.jd_analysis_id,
        overall_score=report.overall_score or 0.0,
        candidate_experience_ids=report.candidate_experience_ids,
        candidate_skill_ids=report.candidate_skill_ids,
        matched_requirements=report.matched_requirements,
        gaps=report.gaps,
        risks=report.risks,
        follow_up_questions=report.follow_up_questions,
        resume_strategy=report.resume_strategy or "",
        candidate_experiences=_ordered_materials(
            db, Experience, report.candidate_experience_ids
        ),
        candidate_skills=_ordered_materials(db, Skill, report.candidate_skill_ids),
    )


@router.post(
    "/jd-analyses/{analysis_id}/match",
    response_model=MatchReportRead,
    status_code=status.HTTP_201_CREATED,
)
def create_match_report(
    analysis_id: int,
    db: Session = Depends(get_db),
) -> MatchReportRead:
    analysis = _analysis_for_user(db, analysis_id)
    experiences = list(
        db.scalars(
            select(Experience)
            .where(Experience.user_id == DEFAULT_USER_ID)
            .order_by(Experience.id)
        )
    )
    skills = list(
        db.scalars(
            select(Skill)
            .where(Skill.user_id == DEFAULT_USER_ID)
            .order_by(Skill.id)
        )
    )
    report = MatchReport(
        user_id=DEFAULT_USER_ID,
        jd_analysis_id=analysis.id,
        **asdict(create_match_placeholder(experiences, skills)),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return _read_report(db, report)


@router.get(
    "/jd-analyses/{analysis_id}/match-reports",
    response_model=list[MatchReportRead],
)
def list_match_reports(
    analysis_id: int,
    db: Session = Depends(get_db),
) -> list[MatchReportRead]:
    analysis = _analysis_for_user(db, analysis_id)
    reports = list(
        db.scalars(
            select(MatchReport)
            .where(
                MatchReport.jd_analysis_id == analysis.id,
                MatchReport.user_id == DEFAULT_USER_ID,
            )
            .order_by(MatchReport.id.desc())
        )
    )
    return [_read_report(db, report) for report in reports]


@router.get("/match-reports/{report_id}", response_model=MatchReportRead)
def get_match_report(
    report_id: int,
    db: Session = Depends(get_db),
) -> MatchReportRead:
    return _read_report(db, _report_for_user(db, report_id))
