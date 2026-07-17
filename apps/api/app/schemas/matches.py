from pydantic import BaseModel, ConfigDict

from app.schemas.profile import ExperienceRead, SkillRead


class MatchReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    jd_analysis_id: int
    overall_score: float
    candidate_experience_ids: list[int]
    candidate_skill_ids: list[int]
    matched_requirements: list[str]
    gaps: list[str]
    risks: list[str]
    follow_up_questions: list[str]
    resume_strategy: str
    candidate_experiences: list[ExperienceRead]
    candidate_skills: list[SkillRead]
