from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import DEFAULT_USER_ID
from app.db.base import Base

# 定义数据在数据库里怎么存，每个类对应一张数据库表
# 两个 Mixin 用于消除重复，因为每张表都要这些字段，所有业务表继承它们，因此自动拥有用户归属和创建、更新时间

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class UserOwnedMixin:
    user_id: Mapped[str] = mapped_column(String(64), default=DEFAULT_USER_ID, index=True)


class StudentProfile(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "student_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(String(120))
    school: Mapped[str | None] = mapped_column(String(160))
    major: Mapped[str | None] = mapped_column(String(160))
    degree: Mapped[str | None] = mapped_column(String(80))
    graduation_date: Mapped[str | None] = mapped_column(String(40))
    language_ability: Mapped[str | None] = mapped_column(Text)


class StudentPreference(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "student_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    target_cities: Mapped[list[str]] = mapped_column(JSON, default=list)
    target_roles: Mapped[list[str]] = mapped_column(JSON, default=list)
    target_industries: Mapped[list[str]] = mapped_column(JSON, default=list)
    excluded_cities: Mapped[list[str]] = mapped_column(JSON, default=list)
    excluded_industries: Mapped[list[str]] = mapped_column(JSON, default=list)
    excluded_role_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    expected_job_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    salary_expectation: Mapped[str | None] = mapped_column(String(120))


class Experience(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "experiences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[str | None] = mapped_column(String(40))
    end_date: Mapped[str | None] = mapped_column(String(40))
    organization: Mapped[str | None] = mapped_column(String(200))
    role: Mapped[str | None] = mapped_column(String(120))
    background: Mapped[str | None] = mapped_column(Text)
    task_content: Mapped[str | None] = mapped_column(Text)
    result: Mapped[str | None] = mapped_column(Text)
    metrics: Mapped[str | None] = mapped_column(Text)


class SkillEvidence(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "skill_evidences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    skill_name: Mapped[str] = mapped_column(String(120))
    proficiency: Mapped[str | None] = mapped_column(String(80))
    experience_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    evidence_summary: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str | None] = mapped_column(Text)


class JobPosting(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "job_postings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company: Mapped[str | None] = mapped_column(String(200))
    title: Mapped[str | None] = mapped_column(String(200))
    location: Mapped[str | None] = mapped_column(String(120))
    source_url: Mapped[str | None] = mapped_column(Text)
    raw_jd_text: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[str | None] = mapped_column(String(40))
    deadline: Mapped[str | None] = mapped_column(String(40))
    job_type: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str | None] = mapped_column(String(80))
    notes: Mapped[str | None] = mapped_column(Text)
    jd_analysis_id: Mapped[int | None] = mapped_column(Integer)


class JDAnalysis(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "jd_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_posting_id: Mapped[int] = mapped_column(ForeignKey("job_postings.id"))
    hard_requirements: Mapped[list[str]] = mapped_column(JSON, default=list)
    bonus_requirements: Mapped[list[str]] = mapped_column(JSON, default=list)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    responsibilities: Mapped[list[str]] = mapped_column(JSON, default=list)
    capability_dimensions: Mapped[list[str]] = mapped_column(JSON, default=list)
    risks: Mapped[list[str]] = mapped_column(JSON, default=list)
    resume_emphasis: Mapped[list[str]] = mapped_column(JSON, default=list)
    completeness_status: Mapped[str | None] = mapped_column(String(80))


class MatchReport(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "match_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jd_analysis_id: Mapped[int] = mapped_column(ForeignKey("jd_analyses.id"))
    overall_score: Mapped[float | None] = mapped_column(Float)
    candidate_experience_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    candidate_skill_evidence_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    matched_requirements: Mapped[list[str]] = mapped_column(JSON, default=list)
    gaps: Mapped[list[str]] = mapped_column(JSON, default=list)
    risks: Mapped[list[str]] = mapped_column(JSON, default=list)
    follow_up_questions: Mapped[list[str]] = mapped_column(JSON, default=list)
    resume_strategy: Mapped[str | None] = mapped_column(Text)


class ResumeVersion(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "resume_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_posting_id: Mapped[int] = mapped_column(ForeignKey("job_postings.id"))
    match_report_id: Mapped[int] = mapped_column(ForeignKey("match_reports.id"))
    markdown_content: Mapped[str] = mapped_column(Text)
    used_experience_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    used_skill_evidence_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    generation_rationale: Mapped[str | None] = mapped_column(Text)
    manual_edit_history: Mapped[list[dict]] = mapped_column(JSON, default=list)


class ApplicationRecord(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "application_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_posting_id: Mapped[int] = mapped_column(ForeignKey("job_postings.id"))
    resume_version_id: Mapped[int] = mapped_column(ForeignKey("resume_versions.id"))
    status: Mapped[str | None] = mapped_column(String(80))
    applied_at: Mapped[str | None] = mapped_column(String(40))
    result: Mapped[str | None] = mapped_column(String(120))


class AppConfig(UserOwnedMixin, TimestampMixin, Base):
    __tablename__ = "app_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    default_output_path: Mapped[str | None] = mapped_column(Text)
    resume_template: Mapped[str | None] = mapped_column(String(120))
    preferred_export_formats: Mapped[list[str]] = mapped_column(JSON, default=list)
    model_provider: Mapped[str | None] = mapped_column(String(120))
    model_config: Mapped[dict] = mapped_column(JSON, default=dict)
    language_preference: Mapped[str | None] = mapped_column(String(40))
    data_directory: Mapped[str | None] = mapped_column(Text)
    privacy_settings: Mapped[dict] = mapped_column(JSON, default=dict)
