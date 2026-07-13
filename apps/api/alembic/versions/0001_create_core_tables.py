"""create core tables

Revision ID: 0001_create_core_tables
Revises:
Create Date: 2026-07-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_create_core_tables"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def _user_id() -> sa.Column:
    return sa.Column("user_id", sa.String(length=64), nullable=False)


def upgrade() -> None:
    op.create_table(
        "student_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("name", sa.String(length=120), nullable=True),
        sa.Column("school", sa.String(length=160), nullable=True),
        sa.Column("major", sa.String(length=160), nullable=True),
        sa.Column("degree", sa.String(length=80), nullable=True),
        sa.Column("graduation_date", sa.String(length=40), nullable=True),
        sa.Column("language_ability", sa.Text(), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_student_profiles_user_id", "student_profiles", ["user_id"])

    op.create_table(
        "student_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("target_cities", sa.JSON(), nullable=False),
        sa.Column("target_roles", sa.JSON(), nullable=False),
        sa.Column("target_industries", sa.JSON(), nullable=False),
        sa.Column("excluded_cities", sa.JSON(), nullable=False),
        sa.Column("excluded_industries", sa.JSON(), nullable=False),
        sa.Column("excluded_role_types", sa.JSON(), nullable=False),
        sa.Column("expected_job_types", sa.JSON(), nullable=False),
        sa.Column("salary_expectation", sa.String(length=120), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_student_preferences_user_id", "student_preferences", ["user_id"])

    op.create_table(
        "experiences",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("type", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("start_date", sa.String(length=40), nullable=True),
        sa.Column("end_date", sa.String(length=40), nullable=True),
        sa.Column("organization", sa.String(length=200), nullable=True),
        sa.Column("role", sa.String(length=120), nullable=True),
        sa.Column("background", sa.Text(), nullable=True),
        sa.Column("task_content", sa.Text(), nullable=True),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("metrics", sa.Text(), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_experiences_user_id", "experiences", ["user_id"])

    op.create_table(
        "skill_evidences",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("skill_name", sa.String(length=120), nullable=False),
        sa.Column("proficiency", sa.String(length=80), nullable=True),
        sa.Column("experience_ids", sa.JSON(), nullable=False),
        sa.Column("evidence_summary", sa.Text(), nullable=True),
        sa.Column("outcome", sa.Text(), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_skill_evidences_user_id", "skill_evidences", ["user_id"])

    op.create_table(
        "job_postings",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("company", sa.String(length=200), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("raw_jd_text", sa.Text(), nullable=True),
        sa.Column("published_at", sa.String(length=40), nullable=True),
        sa.Column("deadline", sa.String(length=40), nullable=True),
        sa.Column("job_type", sa.String(length=80), nullable=True),
        sa.Column("status", sa.String(length=80), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("jd_analysis_id", sa.Integer(), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_job_postings_user_id", "job_postings", ["user_id"])

    op.create_table(
        "jd_analyses",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("job_posting_id", sa.Integer(), nullable=False),
        sa.Column("hard_requirements", sa.JSON(), nullable=False),
        sa.Column("bonus_requirements", sa.JSON(), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=False),
        sa.Column("responsibilities", sa.JSON(), nullable=False),
        sa.Column("capability_dimensions", sa.JSON(), nullable=False),
        sa.Column("risks", sa.JSON(), nullable=False),
        sa.Column("resume_emphasis", sa.JSON(), nullable=False),
        sa.Column("completeness_status", sa.String(length=80), nullable=True),
        sa.ForeignKeyConstraint(["job_posting_id"], ["job_postings.id"]),
        *_timestamps(),
    )
    op.create_index("ix_jd_analyses_user_id", "jd_analyses", ["user_id"])

    op.create_table(
        "match_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("jd_analysis_id", sa.Integer(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("candidate_experience_ids", sa.JSON(), nullable=False),
        sa.Column("candidate_skill_evidence_ids", sa.JSON(), nullable=False),
        sa.Column("matched_requirements", sa.JSON(), nullable=False),
        sa.Column("gaps", sa.JSON(), nullable=False),
        sa.Column("risks", sa.JSON(), nullable=False),
        sa.Column("follow_up_questions", sa.JSON(), nullable=False),
        sa.Column("resume_strategy", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["jd_analysis_id"], ["jd_analyses.id"]),
        *_timestamps(),
    )
    op.create_index("ix_match_reports_user_id", "match_reports", ["user_id"])

    op.create_table(
        "resume_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("job_posting_id", sa.Integer(), nullable=False),
        sa.Column("match_report_id", sa.Integer(), nullable=False),
        sa.Column("markdown_content", sa.Text(), nullable=False),
        sa.Column("used_experience_ids", sa.JSON(), nullable=False),
        sa.Column("used_skill_evidence_ids", sa.JSON(), nullable=False),
        sa.Column("generation_rationale", sa.Text(), nullable=True),
        sa.Column("manual_edit_history", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["job_posting_id"], ["job_postings.id"]),
        sa.ForeignKeyConstraint(["match_report_id"], ["match_reports.id"]),
        *_timestamps(),
    )
    op.create_index("ix_resume_versions_user_id", "resume_versions", ["user_id"])

    op.create_table(
        "application_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("job_posting_id", sa.Integer(), nullable=False),
        sa.Column("resume_version_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=80), nullable=True),
        sa.Column("applied_at", sa.String(length=40), nullable=True),
        sa.Column("result", sa.String(length=120), nullable=True),
        sa.ForeignKeyConstraint(["job_posting_id"], ["job_postings.id"]),
        sa.ForeignKeyConstraint(["resume_version_id"], ["resume_versions.id"]),
        *_timestamps(),
    )
    op.create_index("ix_application_records_user_id", "application_records", ["user_id"])

    op.create_table(
        "app_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        _user_id(),
        sa.Column("default_output_path", sa.Text(), nullable=True),
        sa.Column("resume_template", sa.String(length=120), nullable=True),
        sa.Column("preferred_export_formats", sa.JSON(), nullable=False),
        sa.Column("model_provider", sa.String(length=120), nullable=True),
        sa.Column("model_config", sa.JSON(), nullable=False),
        sa.Column("language_preference", sa.String(length=40), nullable=True),
        sa.Column("data_directory", sa.Text(), nullable=True),
        sa.Column("privacy_settings", sa.JSON(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_app_configs_user_id", "app_configs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_app_configs_user_id", table_name="app_configs")
    op.drop_table("app_configs")
    op.drop_index("ix_application_records_user_id", table_name="application_records")
    op.drop_table("application_records")
    op.drop_index("ix_resume_versions_user_id", table_name="resume_versions")
    op.drop_table("resume_versions")
    op.drop_index("ix_match_reports_user_id", table_name="match_reports")
    op.drop_table("match_reports")
    op.drop_index("ix_jd_analyses_user_id", table_name="jd_analyses")
    op.drop_table("jd_analyses")
    op.drop_index("ix_job_postings_user_id", table_name="job_postings")
    op.drop_table("job_postings")
    op.drop_index("ix_skill_evidences_user_id", table_name="skill_evidences")
    op.drop_table("skill_evidences")
    op.drop_index("ix_experiences_user_id", table_name="experiences")
    op.drop_table("experiences")
    op.drop_index("ix_student_preferences_user_id", table_name="student_preferences")
    op.drop_table("student_preferences")
    op.drop_index("ix_student_profiles_user_id", table_name="student_profiles")
    op.drop_table("student_profiles")
