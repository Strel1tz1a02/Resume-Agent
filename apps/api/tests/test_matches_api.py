from app.core.config import DEFAULT_USER_ID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Experience, JDAnalysis, JobPosting, MatchReport, Skill
from app.services.match_placeholder import create_match_placeholder


RAW_JD = """公司：示例科技
岗位：后端工程师
岗位职责：开发服务
岗位要求：熟悉 Python
"""


def _create_analysis(client: TestClient) -> int:
    job = client.post("/jobs", json={"raw_jd_text": RAW_JD}).json()
    response = client.post(f"/jobs/{job['id']}/jd-analyses")
    assert response.status_code == 201
    return response.json()["id"]


def test_placeholder_match_uses_all_profile_materials() -> None:
    experiences = [
        Experience(
            id=2,
            user_id=DEFAULT_USER_ID,
            type="project",
            name="项目",
        )
    ]
    skills = [
        Skill(
            id=5,
            user_id=DEFAULT_USER_ID,
            description="FastAPI",
        )
    ]

    result = create_match_placeholder(experiences, skills)

    assert result.overall_score == 0.0
    assert result.candidate_experience_ids == [2]
    assert result.candidate_skill_ids == [5]
    assert result.resume_strategy == "占位匹配：生成简历前请确认实际采用的候选材料。"


def test_match_report_creation_history_and_detail(client: TestClient) -> None:
    analysis_id = _create_analysis(client)
    experience = client.post(
        "/experiences",
        json={"type": "project", "name": "求职助手"},
    ).json()
    skill = client.post(
        "/skills",
        json={"category": "Backend", "description": "FastAPI"},
    ).json()

    first = client.post(f"/jd-analyses/{analysis_id}/match")
    second = client.post(f"/jd-analyses/{analysis_id}/match")

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.json()["candidate_experience_ids"] == [experience["id"]]
    assert second.json()["candidate_skill_ids"] == [skill["id"]]
    assert second.json()["candidate_experiences"][0]["name"] == "求职助手"
    assert second.json()["candidate_skills"][0]["description"] == "FastAPI"

    history_response = client.get(
        f"/jd-analyses/{analysis_id}/match-reports"
    )
    assert history_response.status_code == 200
    assert [item["id"] for item in history_response.json()] == [
        second.json()["id"],
        first.json()["id"],
    ]

    detail_response = client.get(f"/match-reports/{first.json()['id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == first.json()["id"]


def test_empty_profile_still_creates_placeholder_report(
    client: TestClient,
) -> None:
    analysis_id = _create_analysis(client)

    response = client.post(f"/jd-analyses/{analysis_id}/match")

    assert response.status_code == 201
    assert response.json()["candidate_experience_ids"] == []
    assert response.json()["candidate_skill_ids"] == []
    assert response.json()["gaps"] == ["画像库暂无可用经历或技能"]
    assert response.json()["follow_up_questions"] == [
        "请先补充经历或技能后再确认选材。"
    ]


def test_other_users_match_resources_are_inaccessible(
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
    db_session.commit()

    assert (
        client.post(f"/jd-analyses/{other_analysis.id}/match").status_code
        == 404
    )
    assert (
        client.get(
            f"/jd-analyses/{other_analysis.id}/match-reports"
        ).status_code
        == 404
    )
    assert client.get(f"/match-reports/{other_report.id}").status_code == 404
