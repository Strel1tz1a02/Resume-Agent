"""rename current JD analysis pointer

Revision ID: 0004_rename_current_jd_analysis_id
Revises: 0003_rename_skill_evidences_to_skills
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_rename_current_jd_analysis_id"
down_revision: str | None = "0003_rename_skill_evidences_to_skills"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("job_postings") as batch_op:
        batch_op.alter_column(
            "jd_analysis_id",
            new_column_name="current_jd_analysis_id",
            existing_type=sa.Integer(),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("job_postings") as batch_op:
        batch_op.alter_column(
            "current_jd_analysis_id",
            new_column_name="jd_analysis_id",
            existing_type=sa.Integer(),
            existing_nullable=True,
        )
