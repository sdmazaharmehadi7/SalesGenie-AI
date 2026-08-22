"""extend_crm_workspace_architecture

Revision ID: 0010_extend_crm_workspace_architecture
Revises: 0009_lead_workspace_fields
Create Date: 2026-08-22

Adds workspace_id and user_id to sales_interactions (Activities/Conversations/Notes),
and backfills them from parent CRM entities.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_workspace_crm"
down_revision: Union[str, None] = "0009_lead_workspace_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add workspace_id column and foreign key to sales_interactions
    op.add_column(
        "sales_interactions",
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        op.f("fk_sales_interactions_workspace_id_workspaces"),
        "sales_interactions",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_sales_interactions_workspace_id"),
        "sales_interactions",
        ["workspace_id"],
        unique=False,
    )

    # 2. Add user_id column (author/creator of interaction) to sales_interactions
    op.add_column(
        "sales_interactions",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        op.f("fk_sales_interactions_user_id_users"),
        "sales_interactions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_sales_interactions_user_id"),
        "sales_interactions",
        ["user_id"],
        unique=False,
    )

    # 3. Backfill workspace_id and user_id from parent leads
    op.execute(
        """
        UPDATE sales_interactions si
        SET 
            workspace_id = COALESCE(si.workspace_id, l.workspace_id),
            user_id = COALESCE(si.user_id, l.assigned_to, l.owner_id, l.created_by)
        FROM leads l
        WHERE si.lead_id = l.id
        """
    )

    # 4. Backfill workspace_id and user_id from parent opportunities
    op.execute(
        """
        UPDATE sales_interactions si
        SET 
            workspace_id = COALESCE(si.workspace_id, o.workspace_id),
            user_id = COALESCE(si.user_id, o.owner_id)
        FROM opportunities o
        WHERE si.opportunity_id = o.id
        """
    )

    # 5. Backfill workspace_id and user_id from parent accounts
    op.execute(
        """
        UPDATE sales_interactions si
        SET 
            workspace_id = COALESCE(si.workspace_id, a.workspace_id),
            user_id = COALESCE(si.user_id, a.owner_id)
        FROM accounts a
        WHERE si.account_id = a.id
        """
    )

    # 6. Backfill workspace_id and user_id from parent contacts
    op.execute(
        """
        UPDATE sales_interactions si
        SET 
            workspace_id = COALESCE(si.workspace_id, c.workspace_id),
            user_id = COALESCE(si.user_id, c.owner_id)
        FROM contacts c
        WHERE si.contact_id = c.id
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_sales_interactions_user_id"), table_name="sales_interactions")
    op.drop_constraint(op.f("fk_sales_interactions_user_id_users"), "sales_interactions", type_="foreignkey")
    op.drop_column("sales_interactions", "user_id")

    op.drop_index(op.f("ix_sales_interactions_workspace_id"), table_name="sales_interactions")
    op.drop_constraint(op.f("fk_sales_interactions_workspace_id_workspaces"), "sales_interactions", type_="foreignkey")
    op.drop_column("sales_interactions", "workspace_id")
