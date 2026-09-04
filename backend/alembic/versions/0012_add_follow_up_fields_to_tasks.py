"""add_follow_up_fields_to_tasks

Revision ID: 0012_add_follow_up_fields
Revises: b4674510aca3
Create Date: 2026-09-04

Adds task_type and rescheduled_at columns to tasks table.
task_type defaults to 'task', index added.
rescheduled_at tracks when a follow-up/task was rescheduled.
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0012_add_follow_up_fields"
down_revision: Union[str, None] = "b4674510aca3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("task_type", sa.String(50), server_default="task", nullable=False),
    )
    op.create_index(
        op.f("ix_tasks_task_type"),
        "tasks",
        ["task_type"],
    )
    op.add_column(
        "tasks",
        sa.Column("rescheduled_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tasks", "rescheduled_at")
    op.drop_index(op.f("ix_tasks_task_type"), table_name="tasks")
    op.drop_column("tasks", "task_type")
