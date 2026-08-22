"""add_lead_created_by_assigned_to

Revision ID: 0009_lead_workspace_fields
Revises: 0008_crm_workspace_id
Create Date: 2026-08-22

Adds two explicit columns to the `leads` table:
  - created_by  (uuid FK → users.id ON DELETE SET NULL)
  - assigned_to (uuid FK → users.id ON DELETE SET NULL)

Backfills both columns from the existing `owner_id` so that no V1 data
is lost. `owner_id` is intentionally left intact for backward compat.

Personal-area leads (workspace_id IS NULL) keep their isolation —
no workspace_id changes are made in this migration.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_lead_workspace_fields"
down_revision: Union[str, None] = "0008_crm_workspace_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add created_by column
    op.add_column(
        "leads",
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_leads_created_by_users",
        "leads",
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_leads_created_by", "leads", ["created_by"])

    # 2. Add assigned_to column
    op.add_column(
        "leads",
        sa.Column(
            "assigned_to",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_leads_assigned_to_users",
        "leads",
        "users",
        ["assigned_to"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_leads_assigned_to", "leads", ["assigned_to"])

    # 3. Backfill from owner_id — safe for all existing V1 data
    #    Any lead that already has owner_id set gets both fields populated.
    #    Leads with owner_id NULL remain NULL in both new columns.
    op.execute(
        "UPDATE leads SET created_by = owner_id WHERE created_by IS NULL AND owner_id IS NOT NULL"
    )
    op.execute(
        "UPDATE leads SET assigned_to = owner_id WHERE assigned_to IS NULL AND owner_id IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_index("ix_leads_assigned_to", table_name="leads")
    op.drop_constraint("fk_leads_assigned_to_users", "leads", type_="foreignkey")
    op.drop_column("leads", "assigned_to")

    op.drop_index("ix_leads_created_by", table_name="leads")
    op.drop_constraint("fk_leads_created_by_users", "leads", type_="foreignkey")
    op.drop_column("leads", "created_by")
