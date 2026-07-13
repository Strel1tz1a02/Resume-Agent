from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_USER_ID
from app.db.session import get_db
from app.models import Experience, SkillEvidence, StudentPreference, StudentProfile
from app.schemas.profile import (
    ExperienceCreate,
    ExperienceRead,
    ExperienceUpdate,
    SkillEvidenceCreate,
    SkillEvidenceRead,
    SkillEvidenceUpdate,
    StudentPreferencePayload,
    StudentPreferenceRead,
    StudentProfilePayload,
    StudentProfileRead,
)

router = APIRouter()


def _first_for_user(db: Session, model: type) -> object | None:
    return db.scalar(select(model).where(model.user_id == DEFAULT_USER_ID))


def _apply_updates(instance: object, values: dict) -> None:
    for key, value in values.items():
        setattr(instance, key, value)


@router.get("/profiles/current", response_model=StudentProfileRead)
def get_current_profile(db: Session = Depends(get_db)) -> StudentProfile:
    profile = _first_for_user(db, StudentProfile)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/profiles/current", response_model=StudentProfileRead)
def upsert_current_profile(
    payload: StudentProfilePayload,
    db: Session = Depends(get_db),
) -> StudentProfile:
    profile = _first_for_user(db, StudentProfile)
    if profile is None:
        profile = StudentProfile(user_id=DEFAULT_USER_ID)
        db.add(profile)
    _apply_updates(profile, payload.model_dump())
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/preferences/current", response_model=StudentPreferenceRead)
def get_current_preference(db: Session = Depends(get_db)) -> StudentPreference:
    preference = _first_for_user(db, StudentPreference)
    if preference is None:
        raise HTTPException(status_code=404, detail="Preference not found")
    return preference


@router.put("/preferences/current", response_model=StudentPreferenceRead)
def upsert_current_preference(
    payload: StudentPreferencePayload,
    db: Session = Depends(get_db),
) -> StudentPreference:
    preference = _first_for_user(db, StudentPreference)
    if preference is None:
        preference = StudentPreference(user_id=DEFAULT_USER_ID)
        db.add(preference)
    _apply_updates(preference, payload.model_dump())
    db.commit()
    db.refresh(preference)
    return preference


@router.get("/experiences", response_model=list[ExperienceRead])
def list_experiences(db: Session = Depends(get_db)) -> list[Experience]:
    return list(
        db.scalars(
            select(Experience)
            .where(Experience.user_id == DEFAULT_USER_ID)
            .order_by(Experience.id)
        )
    )


@router.post(
    "/experiences",
    response_model=ExperienceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_experience(
    payload: ExperienceCreate,
    db: Session = Depends(get_db),
) -> Experience:
    experience = Experience(user_id=DEFAULT_USER_ID, **payload.model_dump())
    db.add(experience)
    db.commit()
    db.refresh(experience)
    return experience


@router.get("/experiences/{experience_id}", response_model=ExperienceRead)
def get_experience(
    experience_id: int,
    db: Session = Depends(get_db),
) -> Experience:
    experience = db.get(Experience, experience_id)
    if experience is None or experience.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="Experience not found")
    return experience


@router.put("/experiences/{experience_id}", response_model=ExperienceRead)
def update_experience(
    experience_id: int,
    payload: ExperienceUpdate,
    db: Session = Depends(get_db),
) -> Experience:
    experience = get_experience(experience_id, db)
    _apply_updates(experience, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(experience)
    return experience


@router.delete("/experiences/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experience(
    experience_id: int,
    db: Session = Depends(get_db),
) -> Response:
    experience = get_experience(experience_id, db)
    db.delete(experience)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/skill-evidences", response_model=list[SkillEvidenceRead])
def list_skill_evidences(db: Session = Depends(get_db)) -> list[SkillEvidence]:
    return list(
        db.scalars(
            select(SkillEvidence)
            .where(SkillEvidence.user_id == DEFAULT_USER_ID)
            .order_by(SkillEvidence.id)
        )
    )


@router.post(
    "/skill-evidences",
    response_model=SkillEvidenceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_skill_evidence(
    payload: SkillEvidenceCreate,
    db: Session = Depends(get_db),
) -> SkillEvidence:
    skill_evidence = SkillEvidence(user_id=DEFAULT_USER_ID, **payload.model_dump())
    db.add(skill_evidence)
    db.commit()
    db.refresh(skill_evidence)
    return skill_evidence


@router.put("/skill-evidences/{skill_evidence_id}", response_model=SkillEvidenceRead)
def update_skill_evidence(
    skill_evidence_id: int,
    payload: SkillEvidenceUpdate,
    db: Session = Depends(get_db),
) -> SkillEvidence:
    skill_evidence = db.get(SkillEvidence, skill_evidence_id)
    if skill_evidence is None or skill_evidence.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="Skill evidence not found")
    _apply_updates(skill_evidence, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(skill_evidence)
    return skill_evidence
