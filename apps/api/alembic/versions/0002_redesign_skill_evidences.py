"""redesign skill evidences

Revision ID: 0002_redesign_skill_evidences
Revises: 0001_create_core_tables
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_redesign_skill_evidences"
down_revision: str | None = "0001_create_core_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("skill_evidences") as batch_op:
        batch_op.add_column(sa.Column("category", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))

    op.execute(
        """
        UPDATE skill_evidences
        SET description = COALESCE(evidence_summary, skill_name, '')
        """
    )

    with op.batch_alter_table("skill_evidences") as batch_op:
        batch_op.alter_column("description", existing_type=sa.Text(), nullable=False)
        batch_op.drop_column("outcome")
        batch_op.drop_column("evidence_summary")
        batch_op.drop_column("experience_ids")
        batch_op.drop_column("proficiency")
        batch_op.drop_column("skill_name")


def downgrade() -> None:
    with op.batch_alter_table("skill_evidences") as batch_op:
        batch_op.add_column(sa.Column("skill_name", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("proficiency", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("experience_ids", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("evidence_summary", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("outcome", sa.Text(), nullable=True))

    op.execute(
        """
        UPDATE skill_evidences
        SET skill_name = COALESCE(category, 'Skill Specialty'),
            experience_ids = '[]',
            evidence_summary = description
        """
    )

    with op.batch_alter_table("skill_evidences") as batch_op:
        batch_op.alter_column("skill_name", existing_type=sa.String(length=120), nullable=False)
        batch_op.alter_column("experience_ids", existing_type=sa.JSON(), nullable=False)
        batch_op.drop_column("description")
        batch_op.drop_column("category")
