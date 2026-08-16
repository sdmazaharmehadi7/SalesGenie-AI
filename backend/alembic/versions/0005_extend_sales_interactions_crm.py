"""Extend sales_interactions with CRM entity FKs.

Revision ID: 0005_crm_interactions
Revises: 0004_add_crm_entities
Create Date: 2026-08-16
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0005_crm_interactions"
down_revision: str | None = "0004_add_crm_entities"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Make lead_id nullable
    op.alter_column("sales_interactions", "lead_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    # Add new FK columns
    op.add_column("sales_interactions", sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("sales_interactions", sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("sales_interactions", sa.Column("opportunity_id", postgresql.UUID(as_uuid=True), nullable=True))

    op.create_foreign_key("fk_si_contact_id", "sales_interactions", "contacts", ["contact_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_si_account_id", "sales_interactions", "accounts", ["account_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_si_opportunity_id", "sales_interactions", "opportunities", ["opportunity_id"], ["id"], ondelete="SET NULL")

    op.create_index("ix_si_contact_id", "sales_interactions", ["contact_id"])
    op.create_index("ix_si_account_id", "sales_interactions", ["account_id"])
    op.create_index("ix_si_opportunity_id", "sales_interactions", ["opportunity_id"])


def downgrade() -> None:
    op.drop_index("ix_si_opportunity_id", "sales_interactions")
    op.drop_index("ix_si_account_id", "sales_interactions")
    op.drop_index("ix_si_contact_id", "sales_interactions")

    op.drop_constraint("fk_si_opportunity_id", "sales_interactions", type_="foreignkey")
    op.drop_constraint("fk_si_account_id", "sales_interactions", type_="foreignkey")
    op.drop_constraint("fk_si_contact_id", "sales_interactions", type_="foreignkey")

    op.drop_column("sales_interactions", "opportunity_id")
    op.drop_column("sales_interactions", "account_id")
    op.drop_column("sales_interactions", "contact_id")

    op.alter_column("sales_interactions", "lead_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
