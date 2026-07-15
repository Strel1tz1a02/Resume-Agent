from dataclasses import dataclass


@dataclass(frozen=True)
class JobFieldExtraction:
    company: str | None
    title: str | None
    location: str | None


@dataclass(frozen=True)
class JDAnalysisResult:
    hard_requirements: list[str]
    bonus_requirements: list[str]
    keywords: list[str]
    responsibilities: list[str]
    capability_dimensions: list[str]
    risks: list[str]
    resume_emphasis: list[str]
    completeness_status: str


def _labeled_values(raw_jd_text: str, label: str) -> list[str]:
    values: list[str] = []
    for line in raw_jd_text.splitlines():
        stripped_line = line.strip()
        if stripped_line.startswith(label):
            value = stripped_line.removeprefix(label).strip()
            if value:
                values.append(value)
    return values


def extract_job_fields(raw_jd_text: str) -> JobFieldExtraction:
    company = _labeled_values(raw_jd_text, "公司：")
    title = _labeled_values(raw_jd_text, "岗位：")
    location = _labeled_values(raw_jd_text, "地点：")

    return JobFieldExtraction(
        company=company[0] if company else None,
        title=title[0] if title else None,
        location=location[0] if location else None,
    )


def analyze_jd(raw_jd_text: str) -> JDAnalysisResult:
    responsibilities = _labeled_values(raw_jd_text, "岗位职责：")
    hard_requirements = _labeled_values(raw_jd_text, "岗位要求：")
    bonus_requirements = _labeled_values(raw_jd_text, "加分项：")
    keyword_positions = [
        (raw_jd_text.index(keyword), keyword)
        for keyword in ("Python", "FastAPI", "RESTful API", "LangGraph")
        if keyword in raw_jd_text
    ]

    return JDAnalysisResult(
        hard_requirements=hard_requirements,
        bonus_requirements=bonus_requirements,
        keywords=[keyword for _, keyword in sorted(keyword_positions)],
        responsibilities=responsibilities,
        capability_dimensions=[],
        risks=[],
        resume_emphasis=[],
        completeness_status=(
            "complete" if responsibilities and hard_requirements else "incomplete"
        ),
    )
