"""Add CRM entities: accounts, contacts, opportunities, tasks + new enums.

Revision ID: 0004_add_crm_entities
Revises: 0003_add_lead_deal_value
Create Date: 2026-08-16
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0004_add_crm_entities"
down_revision: str | None = "0003_add_lead_deal_value"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── New Postgres native enums ─────────────────────────────────────────────
    opportunitystage = postgresql.ENUM(
        "new", "qualified", "demo", "proposal", "negotiation", "won", "lost",
        name="opportunitystage",
        create_type=False,
    )
    opportunitystage.create(op.get_bind(), checkfirst=True)

    taskpriority = postgresql.ENUM(
        "low", "medium", "high", "urgent",
        name="taskpriority",
        create_type=False,
    )
    taskpriority.create(op.get_bind(), checkfirst=True)

    # ── Extend interactiontype enum with new values ───────────────────────────
    connection = op.get_bind()
    for value in ("note", "follow_up", "stage_change"):
        connection.execute(
            sa.text(
                f"DO $$ BEGIN "
                f"IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '{value}' "
                f"AND enumtypid = 'interactiontype'::regtype) THEN "
                f"ALTER TYPE interactiontype ADD VALUE '{value}'; "
                f"END IF; END $$;"
            )
        )

    # ── accounts table ────────────────────────────────────────────────────────
    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(150), nullable=True),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("company_size", sa.String(50), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_accounts_name", "accounts", ["name"])
    op.create_index("ix_accounts_owner_id", "accounts", ["owner_id"])

    # ── contacts table ────────────────────────────────────────────────────────
    op.create_table(
        "contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("job_title", sa.String(150), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true", nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_contacts_email", "contacts", ["email"])
    op.create_index("ix_contacts_account_id", "contacts", ["account_id"])
    op.create_index("ix_contacts_lead_id", "contacts", ["lead_id"])
    op.create_index("ix_contacts_owner_id", "contacts", ["owner_id"])

    # ── opportunities table ───────────────────────────────────────────────────
    op.create_table(
        "opportunities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("probability", sa.Integer, nullable=True),
        sa.Column("expected_close_date", sa.Date, nullable=True),
        sa.Column("is_closed", sa.Boolean, server_default="false", nullable=False),
        sa.Column("is_won", sa.Boolean, server_default="false", nullable=False),
        sa.Column(
            "stage",
            postgresql.ENUM("new", "qualified", "demo", "proposal", "negotiation", "won", "lost", name="opportunitystage", create_type=False),
            server_default="new",
            nullable=False,
        ),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("probability >= 0 AND probability <= 100", name="ck_opportunities_probability_range"),
    )
    op.create_index("ix_opportunities_name", "opportunities", ["name"])
    op.create_index("ix_opportunities_stage", "opportunities", ["stage"])
    op.create_index("ix_opportunities_account_id", "opportunities", ["account_id"])
    op.create_index("ix_opportunities_contact_id", "opportunities", ["contact_id"])
    op.create_index("ix_opportunities_lead_id", "opportunities", ["lead_id"])
    op.create_index("ix_opportunities_owner_id", "opportunities", ["owner_id"])

    # ── tasks table ───────────────────────────────────────────────────────────
    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_completed", sa.Boolean, server_default="false", nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "priority",
            postgresql.ENUM("low", "medium", "high", "urgent", name="taskpriority", create_type=False),
            server_default="medium",
            nullable=False,
        ),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("opportunity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_tasks_assigned_to", "tasks", ["assigned_to"])
    op.create_index("ix_tasks_priority", "tasks", ["priority"])
    op.create_index("ix_tasks_lead_id", "tasks", ["lead_id"])
    op.create_index("ix_tasks_contact_id", "tasks", ["contact_id"])
    op.create_index("ix_tasks_account_id", "tasks", ["account_id"])
    op.create_index("ix_tasks_opportunity_id", "tasks", ["opportunity_id"])

    # ── Add account_id to leads ───────────────────────────────────────────────
    op.add_column("leads", sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_leads_account_id", "leads", "accounts", ["account_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_leads_account_id", "leads", ["account_id"])


def downgrade() -> None:
    op.drop_index("ix_leads_account_id", "leads")
    op.drop_constraint("fk_leads_account_id", "leads", type_="foreignkey")
    op.drop_column("leads", "account_id")

    op.drop_table("tasks")
    op.drop_table("opportunities")
    op.drop_table("contacts")
    op.drop_table("accounts")

    op.execute("DROP TYPE IF EXISTS taskpriority")
    op.execute("DROP TYPE IF EXISTS opportunitystage")
