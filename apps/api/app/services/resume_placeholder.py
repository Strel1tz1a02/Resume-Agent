from collections.abc import Sequence
from dataclasses import dataclass

from app.models import Experience, MatchReport, Skill


@dataclass(frozen=True)
class ResumePlaceholderResult:
    markdown_content: str
    generation_rationale: str


def _experience_lines(experiences: Sequence[Experience]) -> list[str]:
    lines: list[str] = []
    for experience in experiences:
        heading_parts = [experience.name]
        if experience.role:
            heading_parts.append(experience.role)
        if experience.organization:
            heading_parts.append(experience.organization)
        lines.append(f"- **{' · '.join(heading_parts)}**")
        for detail in (
            experience.background,
            experience.task_content,
            experience.result,
            experience.metrics,
        ):
            if detail:
                lines.append(f"  - {detail}")
    return lines


def create_resume_markdown(
    match_report: MatchReport,
    experiences: Sequence[Experience],
    skills: Sequence[Skill],
) -> ResumePlaceholderResult:
    del match_report
    lines = ["# 简历草稿", "", "## 经历"]
    lines.extend(_experience_lines(experiences) or ["- 暂未选择经历"])
    lines.extend(["", "## 技能"])
    lines.extend(f"- {item.description}" for item in skills)
    if not skills:
        lines.append("- 暂未选择技能")
    return ResumePlaceholderResult(
        markdown_content="\n".join(lines),
        generation_rationale="占位生成：Markdown 仅按用户确认的画像事实拼接。",
    )
