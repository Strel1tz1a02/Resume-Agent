"""rename skill evidences to skills

Revision ID: 0003_rename_skill_evidences_to_skills
Revises: 0002_redesign_skill_evidences
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_rename_skill_evidences_to_skills"
down_revision: str | None = "0002_redesign_skill_evidences"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.rename_table("skill_evidences", "skills")
    op.drop_index("ix_skill_evidences_user_id", table_name="skills")
    op.create_index("ix_skills_user_id", "skills", ["user_id"])

    with op.batch_alter_table("match_reports") as batch_op:
        batch_op.alter_column(
            "candidate_skill_evidence_ids",
            new_column_name="candidate_skill_ids",
            existing_type=sa.JSON(),
        )

    with op.batch_alter_table("resume_versions") as batch_op:
        batch_op.alter_column(
            "used_skill_evidence_ids",
            new_column_name="used_skill_ids",
            existing_type=sa.JSON(),
        )


def downgrade() -> None:
    with op.batch_alter_table("resume_versions") as batch_op:
        batch_op.alter_column(
            "used_skill_ids",
            new_column_name="used_skill_evidence_ids",
            existing_type=sa.JSON(),
        )

    with op.batch_alter_table("match_reports") as batch_op:
        batch_op.alter_column(
            "candidate_skill_ids",
            new_column_name="candidate_skill_evidence_ids",
            existing_type=sa.JSON(),
        )

    op.drop_index("ix_skills_user_id", table_name="skills")
    op.rename_table("skills", "skill_evidences")
    op.create_index("ix_skill_evidences_user_id", "skill_evidences", ["user_id"])
