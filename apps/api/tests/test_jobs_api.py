from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import JDAnalysis, JobPosting


RAW_JD = """公司：示例科技
岗位：后端工程师
地点：上海
岗位职责：开发和维护服务
岗位要求：熟悉 Python 和 FastAPI
加分项：了解 LangGraph
"""


def _create_job(client: TestClient, **overrides: object) -> dict:
    payload = {"raw_jd_text": RAW_JD}
    payload.update(overrides)
    response = client.post("/jobs", json=payload)

    assert response.status_code == 201
    return response.json()


def test_job_creation_extracts_fields_and_prefers_non_empty_manual_values(
    client: TestClient,
) -> None:
    extracted_job = _create_job(client)

    assert extracted_job["company"] == "示例科技"
    assert extracted_job["title"] == "后端工程师"
    assert extracted_job["location"] == "上海"

    manual_job = _create_job(
        client,
        company="手工公司",
        title="手工岗位",
        location="杭州",
    )

    assert manual_job["company"] == "手工公司"
    assert manual_job["title"] == "手工岗位"
    assert manual_job["location"] == "杭州"


def test_job_can_be_listed_read_and_partially_updated(client: TestClient) -> None:
    job = _create_job(client, status="saved")

    list_response = client.get("/jobs")
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [job["id"]]

    get_response = client.get(f"/jobs/{job['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["status"] == "saved"

    update_response = client.put(
        f"/jobs/{job['id']}",
        json={"notes": "优先投递"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["notes"] == "优先投递"
    assert update_response.json()["status"] == "saved"


def test_jd_analysis_history_tracks_the_latest_analysis_and_can_be_edited(
    client: TestClient,
) -> None:
    job = _create_job(client)

    first_response = client.post(f"/jobs/{job['id']}/jd-analyses")
    assert first_response.status_code == 201
    first_analysis = first_response.json()

    second_response = client.post(f"/jobs/{job['id']}/jd-analyses")
    assert second_response.status_code == 201
    second_analysis = second_response.json()

    assert first_analysis["id"] != second_analysis["id"]
    assert client.get(f"/jobs/{job['id']}").json()["current_jd_analysis_id"] == second_analysis["id"]

    history_response = client.get(f"/jobs/{job['id']}/jd-analyses")
    assert history_response.status_code == 200
    assert [item["id"] for item in history_response.json()] == [
        second_analysis["id"],
        first_analysis["id"],
    ]

    update_response = client.put(
        f"/jd-analyses/{first_analysis['id']}",
        json={"risks": ["缺少生产经验"]},
    )
    assert update_response.status_code == 200
    assert update_response.json()["risks"] == ["缺少生产经验"]

    get_response = client.get(f"/jd-analyses/{first_analysis['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["risks"] == ["缺少生产经验"]


def test_blank_jd_is_rejected_without_changing_the_current_analysis(
    client: TestClient,
) -> None:
    job = _create_job(client)
    analysis = client.post(f"/jobs/{job['id']}/jd-analyses").json()

    update_response = client.put(
        f"/jobs/{job['id']}",
        json={"raw_jd_text": "  \n\t  "},
    )
    assert update_response.status_code == 200

    response = client.post(f"/jobs/{job['id']}/jd-analyses")
    assert response.status_code == 422
    assert client.get(f"/jobs/{job['id']}").json()["current_jd_analysis_id"] == analysis["id"]


def test_deleting_a_job_removes_its_jd_analyses(
    client: TestClient,
    db_session: Session,
) -> None:
    job = _create_job(client)
    analysis = client.post(f"/jobs/{job['id']}/jd-analyses").json()
    other_user_analysis = JDAnalysis(
        user_id="other-user",
        job_posting_id=job["id"],
        hard_requirements=[],
        bonus_requirements=[],
        keywords=[],
        responsibilities=[],
        capability_dimensions=[],
        risks=[],
        resume_emphasis=[],
        completeness_status="incomplete",
    )
    db_session.add(other_user_analysis)
    db_session.commit()

    response = client.delete(f"/jobs/{job['id']}")
    assert response.status_code == 204
    assert db_session.get(JobPosting, job["id"]) is None
    assert db_session.get(JDAnalysis, analysis["id"]) is None
    assert db_session.get(JDAnalysis, other_user_analysis.id) is None


def test_other_users_jobs_and_analyses_are_inaccessible(
    client: TestClient,
    db_session: Session,
) -> None:
    other_job = JobPosting(user_id="other-user", raw_jd_text=RAW_JD)
    other_analysis = JDAnalysis(
        user_id="other-user",
        job_posting_id=1,
        hard_requirements=[],
        bonus_requirements=[],
        keywords=[],
        responsibilities=[],
        capability_dimensions=[],
        risks=[],
        resume_emphasis=[],
        completeness_status="incomplete",
    )
    db_session.add(other_job)
    db_session.flush()
    other_analysis.job_posting_id = other_job.id
    db_session.add(other_analysis)
    db_session.commit()

    assert client.get(f"/jobs/{other_job.id}").status_code == 404
    assert client.put(f"/jobs/{other_job.id}", json={"notes": "nope"}).status_code == 404
    assert client.get(f"/jd-analyses/{other_analysis.id}").status_code == 404
    assert client.put(
        f"/jd-analyses/{other_analysis.id}",
        json={"risks": ["nope"]},
    ).status_code == 404
    assert db_session.scalar(select(JobPosting).where(JobPosting.id == other_job.id)) is other_job
