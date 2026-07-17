from app.core.config import DEFAULT_USER_ID
from inspect import signature

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Experience,
    JDAnalysis,
    JobPosting,
    MatchReport,
    ResumeVersion,
    Skill,
)
from app.services.resume_placeholder import create_resume_markdown


RAW_JD = """公司：示例科技
岗位：后端工程师
岗位职责：开发服务
岗位要求：熟悉 Python
"""


def _create_report_with_materials(client: TestClient) -> tuple[dict, dict, dict, dict]:
    job = client.post("/jobs", json={"raw_jd_text": RAW_JD}).json()
    analysis = client.post(f"/jobs/{job['id']}/jd-analyses").json()
    experience = client.post(
        "/experiences",
        json={
            "type": "project",
            "name": "求职助手",
            "result": "跑通闭环",
        },
    ).json()
    skill = client.post(
        "/skills",
        json={"category": "Backend", "description": "FastAPI"},
    ).json()
    report = client.post(f"/jd-analyses/{analysis['id']}/match").json()
    return job, report, experience, skill


def test_resume_placeholder_only_uses_selected_facts() -> None:
    report = MatchReport(
        id=9,
        user_id=DEFAULT_USER_ID,
        jd_analysis_id=3,
    )
    experience = Experience(
        id=2,
        user_id=DEFAULT_USER_ID,
        type="project",
        name="求职助手",
        result="跑通闭环",
    )
    skill = Skill(
        id=5,
        user_id=DEFAULT_USER_ID,
        category="Backend",
        description="FastAPI",
    )

    result = create_resume_markdown(report, [experience], [skill])

    assert "# 简历草稿" in result.markdown_content
    assert "求职助手" in result.markdown_content
    assert "跑通闭环" in result.markdown_content
    assert "FastAPI" in result.markdown_content
    assert result.generation_rationale == (
        "占位生成：Markdown 仅按用户确认的画像事实拼接。"
    )


def test_resume_service_boundary_only_accepts_report_and_materials() -> None:
    assert list(signature(create_resume_markdown).parameters) == [
        "match_report",
        "experiences",
        "skills",
    ]


def test_resume_version_uses_confirmed_candidate_subset(
    client: TestClient,
) -> None:
    job, report, experience, skill = _create_report_with_materials(client)

    response = client.post(
        f"/match-reports/{report['id']}/resume-versions",
        json={
            "used_experience_ids": [experience["id"]],
            "used_skill_ids": [],
        },
    )

    assert response.status_code == 201
    version = response.json()
    assert version["job_posting_id"] == job["id"]
    assert version["match_report_id"] == report["id"]
    assert version["used_experience_ids"] == [experience["id"]]
    assert version["used_skill_ids"] == []
    assert version["used_experiences"][0]["name"] == "求职助手"
    assert version["used_skills"] == []
    assert "求职助手" in version["markdown_content"]
    assert "FastAPI" not in version["markdown_content"]
    assert version["job_company"] == "示例科技"
    assert version["job_title"] == "后端工程师"

    list_response = client.get("/resume-versions")
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [version["id"]]
    assert client.get(f"/resume-versions/{version['id']}").json() == version


def test_resume_version_rejects_non_candidate_and_duplicate_ids(
    client: TestClient,
) -> None:
    _, report, experience, _ = _create_report_with_materials(client)

    non_candidate = client.post(
        f"/match-reports/{report['id']}/resume-versions",
        json={"used_experience_ids": [999], "used_skill_ids": []},
    )
    duplicate = client.post(
        f"/match-reports/{report['id']}/resume-versions",
        json={
            "used_experience_ids": [experience["id"], experience["id"]],
            "used_skill_ids": [],
        },
    )

    assert non_candidate.status_code == 422
    assert duplicate.status_code == 422
    assert client.get("/resume-versions").json() == []


def test_resume_markdown_update_adds_history_without_changing_materials(
    client: TestClient,
) -> None:
    _, report, experience, skill = _create_report_with_materials(client)
    version = client.post(
        f"/match-reports/{report['id']}/resume-versions",
        json={
            "used_experience_ids": [experience["id"]],
            "used_skill_ids": [skill["id"]],
        },
    ).json()

    response = client.put(
        f"/resume-versions/{version['id']}",
        json={"markdown_content": "# 人工修改后的简历"},
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["markdown_content"] == "# 人工修改后的简历"
    assert updated["used_experience_ids"] == [experience["id"]]
    assert updated["used_skill_ids"] == [skill["id"]]
    assert len(updated["manual_edit_history"]) == 1
    history = updated["manual_edit_history"][0]
    assert history["edited_at"]
    assert history["before_summary"] == version["markdown_content"][:120]
    assert history["after_summary"] == "# 人工修改后的简历"


def test_other_users_resume_resources_are_inaccessible(
    client: TestClient,
    db_session: Session,
) -> None:
    other_job = JobPosting(user_id="other-user", raw_jd_text=RAW_JD)
    db_session.add(other_job)
    db_session.flush()
    other_analysis = JDAnalysis(
        user_id="other-user",
        job_posting_id=other_job.id,
        hard_requirements=[],
        bonus_requirements=[],
        keywords=[],
        responsibilities=[],
        capability_dimensions=[],
        risks=[],
        resume_emphasis=[],
        completeness_status="incomplete",
    )
    db_session.add(other_analysis)
    db_session.flush()
    other_report = MatchReport(
        user_id="other-user",
        jd_analysis_id=other_analysis.id,
        overall_score=0.0,
        candidate_experience_ids=[],
        candidate_skill_ids=[],
        matched_requirements=[],
        gaps=[],
        risks=[],
        follow_up_questions=[],
        resume_strategy="占位",
    )
    db_session.add(other_report)
    db_session.flush()
    other_version = ResumeVersion(
        user_id="other-user",
        job_posting_id=other_job.id,
        match_report_id=other_report.id,
        markdown_content="# 私有简历",
        used_experience_ids=[],
        used_skill_ids=[],
        manual_edit_history=[],
    )
    db_session.add(other_version)
    db_session.commit()

    create_response = client.post(
        f"/match-reports/{other_report.id}/resume-versions",
        json={"used_experience_ids": [], "used_skill_ids": []},
    )
    assert create_response.status_code == 404
    assert client.get(f"/resume-versions/{other_version.id}").status_code == 404
    assert (
        client.put(
            f"/resume-versions/{other_version.id}",
            json={"markdown_content": "nope"},
        ).status_code
        == 404
    )
