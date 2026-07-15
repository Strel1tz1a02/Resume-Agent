import pytest
from pydantic import ValidationError

from app.schemas.jobs import (
    JDAnalysisRead,
    JDAnalysisUpdate,
    JobPostingCreate,
    JobPostingRead,
    JobPostingUpdate,
)
from app.services.jd_rules import analyze_jd, extract_job_fields


RAW_JD = """公司：星河科技
岗位：Python 后端实习生
地点：杭州
岗位职责：使用 FastAPI 开发接口，参与 AI 应用服务化。
岗位要求：熟悉 Python 和 RESTful API。
加分项：了解 LangGraph。"""


def test_extract_job_fields_reads_explicit_labels() -> None:
    result = extract_job_fields(RAW_JD)

    assert result.company == "星河科技"
    assert result.title == "Python 后端实习生"
    assert result.location == "杭州"


def test_analyze_jd_maps_labeled_content_to_deterministic_result() -> None:
    result = analyze_jd(RAW_JD)

    assert result.hard_requirements == ["熟悉 Python 和 RESTful API。"]
    assert result.bonus_requirements == ["了解 LangGraph。"]
    assert result.keywords == ["Python", "FastAPI", "RESTful API", "LangGraph"]
    assert result.responsibilities == ["使用 FastAPI 开发接口，参与 AI 应用服务化。"]
    assert result.capability_dimensions == []
    assert result.risks == []
    assert result.resume_emphasis == []
    assert result.completeness_status == "complete"


def test_analyze_jd_marks_missing_requirements_incomplete() -> None:
    result = analyze_jd("岗位：Python 后端实习生")

    assert result.completeness_status == "incomplete"
    assert result.hard_requirements == []
    assert result.responsibilities == []
    assert result.keywords == ["Python"]


def test_job_posting_create_requires_non_empty_raw_jd_text() -> None:
    with pytest.raises(ValidationError):
        JobPostingCreate(raw_jd_text="")

    posting = JobPostingCreate(raw_jd_text="岗位：Python 后端实习生")

    assert posting.company is None
    assert posting.notes is None


def test_job_posting_update_allows_omitting_every_field() -> None:
    assert JobPostingUpdate().model_dump(exclude_unset=True) == {}


def test_read_schemas_expose_identifiers_and_orm_configuration() -> None:
    posting = JobPostingRead(
        id=1,
        raw_jd_text="岗位：Python 后端实习生",
        current_jd_analysis_id=None,
    )
    analysis = JDAnalysisRead(
        id=2,
        job_posting_id=1,
        hard_requirements=["熟悉 Python"],
        bonus_requirements=[],
        keywords=["Python"],
        responsibilities=["开发接口"],
        capability_dimensions=[],
        risks=[],
        resume_emphasis=[],
        completeness_status="complete",
    )

    assert posting.id == 1
    assert analysis.job_posting_id == 1
    assert JobPostingRead.model_config.get("from_attributes") is True
    assert JDAnalysisRead.model_config.get("from_attributes") is True


def test_jd_analysis_update_allows_omitting_every_result_field() -> None:
    assert JDAnalysisUpdate().model_dump(exclude_unset=True) == {}
