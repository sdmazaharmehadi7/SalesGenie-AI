"""add_crm_workspace_id

Revision ID: 0008_crm_workspace_id
Revises: 0007_add_workspace_invitations
Create Date: 2026-08-22

Adds nullable workspace_id FK columns to CRM tables:
  - leads
  - accounts
  - contacts
  - opportunities
  - tasks

NULL workspace_id indicates Personal Area data.
Existing data rows are fully preserved.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_crm_workspace_id"
down_revision: Union[str, None] = "0007_add_workspace_invitations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CRM_TABLES = ["leads", "accounts", "contacts", "opportunities", "tasks"]


def upgrade() -> None:
    for table in CRM_TABLES:
        op.add_column(
            table,
            sa.Column(
                "workspace_id",
                postgresql.UUID(as_uuid=True),
                nullable=True,
            ),
        )
        op.create_foreign_key(
            op.f(f"fk_{table}_workspace_id_workspaces"),
            table,
            "workspaces",
            ["workspace_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index(
            op.f(f"ix_{table}_workspace_id"),
            table,
            ["workspace_id"],
        )


def downgrade() -> None:
    for table in reversed(CRM_TABLES):
        op.drop_index(op.f(f"ix_{table}_workspace_id"), table_name=table)
        op.drop_constraint(op.f(f"fk_{table}_workspace_id_workspaces"), table, type_="foreignkey")
        op.drop_column(table, "workspace_id")
