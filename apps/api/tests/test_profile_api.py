from fastapi.testclient import TestClient


def test_profile_current_can_be_upserted(client: TestClient) -> None:
    response = client.put(
        "/profiles/current",
        json={
            "name": "张三",
            "school": "某大学",
            "major": "计算机科学",
            "degree": "本科",
            "graduation_date": "2027-06",
            "language_ability": "CET-6",
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "张三"

    get_response = client.get("/profiles/current")

    assert get_response.status_code == 200
    assert get_response.json()["major"] == "计算机科学"


def test_preference_current_can_store_multiple_targets(client: TestClient) -> None:
    response = client.put(
        "/preferences/current",
        json={
            "target_cities": ["上海", "杭州"],
            "target_roles": ["后端开发", "AI 工程"],
            "target_industries": ["互联网"],
            "excluded_cities": ["北京"],
            "excluded_industries": [],
            "excluded_role_types": ["销售"],
            "expected_job_types": ["实习", "校招"],
            "salary_expectation": "面议",
        },
    )

    assert response.status_code == 200
    assert response.json()["target_cities"] == ["上海", "杭州"]

    get_response = client.get("/preferences/current")

    assert get_response.status_code == 200
    assert get_response.json()["excluded_role_types"] == ["销售"]


def test_experience_crud(client: TestClient) -> None:
    create_response = client.post(
        "/experiences",
        json={
            "type": "project",
            "name": "简历 Agent",
            "start_date": "2026-07",
            "end_date": "2026-08",
            "organization": "个人项目",
            "role": "开发者",
            "background": "校招简历适配",
            "task_content": "构建本地 Web App",
            "result": "完成第一阶段骨架",
            "metrics": "1 个后端 health 接口，1 个前端工作台",
        },
    )

    assert create_response.status_code == 201
    experience_id = create_response.json()["id"]

    list_response = client.get("/experiences")

    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [experience_id]

    update_response = client.put(
        f"/experiences/{experience_id}",
        json={"result": "完成前后端骨架和验证"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["result"] == "完成前后端骨架和验证"

    get_response = client.get(f"/experiences/{experience_id}")

    assert get_response.status_code == 200
    assert get_response.json()["name"] == "简历 Agent"

    delete_response = client.delete(f"/experiences/{experience_id}")

    assert delete_response.status_code == 204
    assert client.get("/experiences").json() == []


def test_skill_evidence_can_reference_multiple_experiences(client: TestClient) -> None:
    first_experience = client.post(
        "/experiences",
        json={"type": "project", "name": "项目 A"},
    ).json()
    second_experience = client.post(
        "/experiences",
        json={"type": "internship", "name": "实习 B"},
    ).json()

    create_response = client.post(
        "/skill-evidences",
        json={
            "skill_name": "Python",
            "proficiency": "熟悉",
            "experience_ids": [first_experience["id"], second_experience["id"]],
            "evidence_summary": "在项目和实习中使用 Python 构建 API",
            "outcome": "完成后端服务",
        },
    )

    assert create_response.status_code == 201
    assert create_response.json()["experience_ids"] == [
        first_experience["id"],
        second_experience["id"],
    ]

    update_response = client.put(
        f"/skill-evidences/{create_response.json()['id']}",
        json={"proficiency": "熟练"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["proficiency"] == "熟练"

    list_response = client.get("/skill-evidences")

    assert list_response.status_code == 200
    assert list_response.json()[0]["skill_name"] == "Python"
