from app.db.base import Base


def test_core_tables_have_user_id() -> None:
    expected_tables = {
        "student_profiles",
        "student_preferences",
        "experiences",
        "skill_evidences",
        "job_postings",
        "jd_analyses",
        "match_reports",
        "resume_versions",
        "application_records",
        "app_configs",
    }

    assert set(Base.metadata.tables.keys()) == expected_tables

    for table_name in expected_tables:
        assert "user_id" in Base.metadata.tables[table_name].columns


def test_cross_record_relationship_columns_match_spec() -> None:
    assert "published_at" in Base.metadata.tables["job_postings"].columns
    assert "jd_analysis_id" in Base.metadata.tables["job_postings"].columns
    assert "job_posting_id" in Base.metadata.tables["jd_analyses"].columns
    assert "jd_analysis_id" in Base.metadata.tables["match_reports"].columns
    assert "job_posting_id" in Base.metadata.tables["resume_versions"].columns
    assert "match_report_id" in Base.metadata.tables["resume_versions"].columns
    assert "job_posting_id" in Base.metadata.tables["application_records"].columns
    assert "resume_version_id" in Base.metadata.tables["application_records"].columns
