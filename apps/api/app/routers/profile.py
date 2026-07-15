from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_USER_ID
from app.db.session import get_db
from app.models import Experience, Skill, StudentPreference, StudentProfile
from app.schemas.profile import (
    ExperienceCreate,
    ExperienceRead,
    ExperienceUpdate,
    SkillCreate,
    SkillRead,
    SkillUpdate,
    StudentPreferencePayload,
    StudentPreferenceRead,
    StudentProfilePayload,
    StudentProfileRead,
)

router = APIRouter()

# Depends 作用：
# 手动调用带 yield 的 get_db()：必须自己管理生成器的恢复或关闭。
# 使用 Depends(get_db)：FastAPI 替你可靠地管理整个生成器生命周期。

# response_model 作用：
# 后端返回的 JSON 必须符合 response_model 的定义，否则报错。

# payload.model_dump(exclude_unset=True)：
# exclude_unset=True 会排除没有传入的字段，避免把原有的 name、role 等字段覆盖成 None

def _first_for_user(db: Session, model: type) -> object | None:
    return db.scalar(select(model).where(model.user_id == DEFAULT_USER_ID)) # scalar：返回查询结果的第一行第一列的值，如果没有结果则返回 None。


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


@router.get("/skills", response_model=list[SkillRead])
def list_skills(db: Session = Depends(get_db)) -> list[Skill]:
    return list(
        db.scalars(
            select(Skill)
            .where(Skill.user_id == DEFAULT_USER_ID)
            .order_by(Skill.id)
        )
    )


@router.post(
    "/skills",
    response_model=SkillRead,
    status_code=status.HTTP_201_CREATED,
)
def create_skill(
    payload: SkillCreate,
    db: Session = Depends(get_db),
) -> Skill:
    skill = Skill(user_id=DEFAULT_USER_ID, **payload.model_dump())
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.put("/skills/{skill_id}", response_model=SkillRead)
def update_skill(
    skill_id: int,
    payload: SkillUpdate,
    db: Session = Depends(get_db),
) -> Skill:
    skill = db.get(Skill, skill_id)
    if skill is None or skill.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="Skill not found")
    _apply_updates(skill, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(skill)
    return skill
