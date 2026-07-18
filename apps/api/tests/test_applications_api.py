from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    ApplicationRecord,
    JDAnalysis,
    JobPosting,
    MatchReport,
    ResumeVersion,
)


RAW_JD = """公司：示例科技
岗位：后端工程师
岗位职责：开发服务
岗位要求：熟悉 Python
"""


def _create_job_and_resume(
    client: TestClient,
    *,
    company: str = "示例科技",
    title: str = "后端工程师",
) -> tuple[dict, dict]:
    job = client.post(
        "/jobs",
        json={"company": company, "title": title, "raw_jd_text": RAW_JD},
    ).json()
    analysis = client.post(f"/jobs/{job['id']}/jd-analyses").json()
    report = client.post(f"/jd-analyses/{analysis['id']}/match").json()
    version = client.post(
        f"/match-reports/{report['id']}/resume-versions",
        json={"used_experience_ids": [], "used_skill_ids": []},
    ).json()
    return job, version


def test_application_create_list_and_update(client: TestClient) -> None:
    job, version = _create_job_and_resume(client)

    created_response = client.post(
        "/applications",
        json={
            "job_posting_id": job["id"],
            "resume_version_id": version["id"],
            "status": "preparing",
            "applied_at": None,
            "result": None,
        },
    )

    assert created_response.status_code == 201
    created = created_response.json()
    assert created["job_posting_id"] == job["id"]
    assert created["resume_version_id"] == version["id"]
    assert created["status"] == "preparing"
    assert created["job_company"] == "示例科技"
    assert created["job_title"] == "后端工程师"
    assert created["resume_version_label"] == f"简历 #{version['id']}"
    assert created["created_at"]
    assert created["updated_at"]

    list_response = client.get("/applications")
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [created["id"]]

    updated_response = client.put(
        f"/applications/{created['id']}",
        json={
            "status": "applied",
            "applied_at": "2026-07-18T10:00",
            "result": "等待反馈",
        },
    )

    assert updated_response.status_code == 200
    updated = updated_response.json()
    assert updated["status"] == "applied"
    assert updated["applied_at"] == "2026-07-18T10:00"
    assert updated["result"] == "等待反馈"
    assert updated["job_posting_id"] == job["id"]
    assert updated["resume_version_id"] == version["id"]


def test_application_rejects_resume_from_another_job(client: TestClient) -> None:
    first_job, _ = _create_job_and_resume(client)
    _, second_version = _create_job_and_resume(
        client,
        company="另一家公司",
        title="全栈工程师",
    )

    response = client.post(
        "/applications",
        json={
            "job_posting_id": first_job["id"],
            "resume_version_id": second_version["id"],
        },
    )

    assert response.status_code == 422
    assert client.get("/applications").json() == []


def test_application_rejects_duplicate_job_and_invalid_status(
    client: TestClient,
) -> None:
    job, version = _create_job_and_resume(client)
    payload = {
        "job_posting_id": job["id"],
        "resume_version_id": version["id"],
    }
    created = client.post("/applications", json=payload)

    assert created.status_code == 201
    assert client.post("/applications", json=payload).status_code == 409
    assert (
        client.put(
            f"/applications/{created.json()['id']}",
            json={"status": "unknown", "applied_at": None, "result": None},
        ).status_code
        == 422
    )


def test_application_update_rejects_link_changes(client: TestClient) -> None:
    job, version = _create_job_and_resume(client)
    created = client.post(
        "/applications",
        json={
            "job_posting_id": job["id"],
            "resume_version_id": version["id"],
        },
    ).json()

    response = client.put(
        f"/applications/{created['id']}",
        json={
            "status": "interview",
            "applied_at": None,
            "result": None,
            "job_posting_id": 999,
        },
    )

    assert response.status_code == 422


def test_application_missing_resources_return_not_found(client: TestClient) -> None:
    assert (
        client.post(
            "/applications",
            json={"job_posting_id": 999, "resume_version_id": 999},
        ).status_code
        == 404
    )
    assert (
        client.put(
            "/applications/999",
            json={"status": "preparing", "applied_at": None, "result": None},
        ).status_code
        == 404
    )


def test_other_users_applications_are_inaccessible(
    client: TestClient,
    db_session: Session,
) -> None:
    other_job = JobPosting(
        user_id="other-user",
        company="私有公司",
        title="私有岗位",
        raw_jd_text=RAW_JD,
    )
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
    db_session.flush()
    other_application = ApplicationRecord(
        user_id="other-user",
        job_posting_id=other_job.id,
        resume_version_id=other_version.id,
        status="preparing",
    )
    db_session.add(other_application)
    db_session.commit()

    assert client.get("/applications").json() == []
    assert (
        client.post(
            "/applications",
            json={
                "job_posting_id": other_job.id,
                "resume_version_id": other_version.id,
            },
        ).status_code
        == 404
    )
    assert (
        client.put(
            f"/applications/{other_application.id}",
            json={"status": "offer", "applied_at": None, "result": None},
        ).status_code
        == 404
    )
