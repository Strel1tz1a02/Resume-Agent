from collections.abc import Sequence
from dataclasses import dataclass

from app.models import Experience, Skill


@dataclass(frozen=True)
class MatchPlaceholderResult:
    overall_score: float
    candidate_experience_ids: list[int]
    candidate_skill_ids: list[int]
    matched_requirements: list[str]
    gaps: list[str]
    risks: list[str]
    follow_up_questions: list[str]
    resume_strategy: str


def create_match_placeholder(
    experiences: Sequence[Experience],
    skills: Sequence[Skill],
) -> MatchPlaceholderResult:
    has_materials = bool(experiences or skills)
    return MatchPlaceholderResult(
        overall_score=0.0,
        candidate_experience_ids=[item.id for item in experiences],
        candidate_skill_ids=[item.id for item in skills],
        matched_requirements=["占位匹配尚未评估具体要求"] if has_materials else [],
        gaps=[] if has_materials else ["画像库暂无可用经历或技能"],
        risks=["当前结果由占位服务生成，未进行相关性计算"],
        follow_up_questions=(
            [] if has_materials else ["请先补充经历或技能后再确认选材。"]
        ),
        resume_strategy="占位匹配：生成简历前请确认实际采用的候选材料。",
    )
