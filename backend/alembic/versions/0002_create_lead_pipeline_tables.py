"""create lead pipeline tables

Revision ID: 0002_create_lead_pipeline_tables
Revises: 0001_create_users_table
Create Date: 2026-07-26 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_create_lead_pipeline_tables"
down_revision: Union[str, None] = "0001_create_users_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LEAD_STATUS_VALUES = ("new", "qualified", "proposal", "negotiation", "closed_won", "closed_lost")
CAMPAIGN_STATUS_VALUES = ("draft", "sent", "opened", "replied", "bounced")
INTERACTION_TYPE_VALUES = ("call", "email", "meeting", "demo", "other")
SYNC_STATUS_VALUES = ("success", "failed", "pending")


def upgrade() -> None:
    bind = op.get_bind()

    leadstatus_enum = postgresql.ENUM(*LEAD_STATUS_VALUES, name="leadstatus")
    campaignstatus_enum = postgresql.ENUM(*CAMPAIGN_STATUS_VALUES, name="campaignstatus")
    interactiontype_enum = postgresql.ENUM(*INTERACTION_TYPE_VALUES, name="interactiontype")
    syncstatus_enum = postgresql.ENUM(*SYNC_STATUS_VALUES, name="syncstatus")

    leadstatus_enum.create(bind, checkfirst=True)
    campaignstatus_enum.create(bind, checkfirst=True)
    interactiontype_enum.create(bind, checkfirst=True)
    syncstatus_enum.create(bind, checkfirst=True)

    # ------------------------------------------------------------------
    # leads
    # ------------------------------------------------------------------
    op.create_table(
        "leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("industry", sa.String(length=150), nullable=True),
        sa.Column("contact_name", sa.String(length=150), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column(
            "lead_status",
            postgresql.ENUM(*LEAD_STATUS_VALUES, name="leadstatus", create_type=False),
            nullable=False,
            server_default="new",
        ),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_leads")),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name=op.f("fk_leads_owner_id_users"), ondelete="SET NULL"
        ),
    )
    op.create_index(op.f("ix_leads_company_name"), "leads", ["company_name"])
    op.create_index(op.f("ix_leads_lead_status"), "leads", ["lead_status"])
    op.create_index(op.f("ix_leads_owner_id"), "leads", ["owner_id"])

    # ------------------------------------------------------------------
    # company_insights
    # ------------------------------------------------------------------
    op.create_table(
        "company_insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_needs", sa.Text(), nullable=True),
        sa.Column("opportunities", sa.Text(), nullable=True),
        sa.Column("industry_analysis", sa.Text(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_company_insights")),
        sa.ForeignKeyConstraint(
            ["lead_id"], ["leads.id"], name=op.f("fk_company_insights_lead_id_leads"), ondelete="CASCADE"
        ),
    )
    op.create_index(op.f("ix_company_insights_lead_id"), "company_insights", ["lead_id"])

    # ------------------------------------------------------------------
    # lead_scores
    # ------------------------------------------------------------------
    op.create_table(
        "lead_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_score", sa.Integer(), nullable=False),
        sa.Column("conversion_probability", sa.Float(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_lead_scores")),
        sa.ForeignKeyConstraint(
            ["lead_id"], ["leads.id"], name=op.f("fk_lead_scores_lead_id_leads"), ondelete="CASCADE"
        ),
        sa.CheckConstraint(
            "lead_score >= 0 AND lead_score <= 100", name="ck_lead_scores_lead_score_range"
        ),
        sa.CheckConstraint(
            "conversion_probability >= 0 AND conversion_probability <= 1",
            name="ck_lead_scores_conversion_probability_range",
        ),
    )
    op.create_index(op.f("ix_lead_scores_lead_id"), "lead_scores", ["lead_id"])

    # ------------------------------------------------------------------
    # outreach_campaigns
    # ------------------------------------------------------------------
    op.create_table(
        "outreach_campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email_subject", sa.String(length=255), nullable=False),
        sa.Column("email_content", sa.Text(), nullable=False),
        sa.Column(
            "campaign_status",
            postgresql.ENUM(*CAMPAIGN_STATUS_VALUES, name="campaignstatus", create_type=False),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_outreach_campaigns")),
        sa.ForeignKeyConstraint(
            ["lead_id"], ["leads.id"], name=op.f("fk_outreach_campaigns_lead_id_leads"), ondelete="CASCADE"
        ),
    )
    op.create_index(op.f("ix_outreach_campaigns_lead_id"), "outreach_campaigns", ["lead_id"])
    op.create_index(op.f("ix_outreach_campaigns_campaign_status"), "outreach_campaigns", ["campaign_status"])

    # ------------------------------------------------------------------
    # sales_interactions
    # ------------------------------------------------------------------
    op.create_table(
        "sales_interactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "interaction_type",
            postgresql.ENUM(*INTERACTION_TYPE_VALUES, name="interactiontype", create_type=False),
            nullable=False,
            server_default="other",
        ),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("action_items", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("interaction_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sales_interactions")),
        sa.ForeignKeyConstraint(
            ["lead_id"], ["leads.id"], name=op.f("fk_sales_interactions_lead_id_leads"), ondelete="CASCADE"
        ),
    )
    op.create_index(op.f("ix_sales_interactions_lead_id"), "sales_interactions", ["lead_id"])

    # ------------------------------------------------------------------
    # crm_sync_logs
    # ------------------------------------------------------------------
    op.create_table(
        "crm_sync_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("crm_platform", sa.String(length=100), nullable=False),
        sa.Column(
            "sync_status",
            postgresql.ENUM(*SYNC_STATUS_VALUES, name="syncstatus", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crm_sync_logs")),
        sa.ForeignKeyConstraint(
            ["lead_id"], ["leads.id"], name=op.f("fk_crm_sync_logs_lead_id_leads"), ondelete="CASCADE"
        ),
    )
    op.create_index(op.f("ix_crm_sync_logs_lead_id"), "crm_sync_logs", ["lead_id"])
    op.create_index(op.f("ix_crm_sync_logs_sync_status"), "crm_sync_logs", ["sync_status"])

    # ------------------------------------------------------------------
    # sales_analytics
    # ------------------------------------------------------------------
    op.create_table(
        "sales_analytics",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversion_rate", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("pipeline_value", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sales_analytics")),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_sales_analytics_user_id_users"), ondelete="CASCADE"
        ),
    )
    op.create_index(op.f("ix_sales_analytics_user_id"), "sales_analytics", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_sales_analytics_user_id"), table_name="sales_analytics")
    op.drop_table("sales_analytics")

    op.drop_index(op.f("ix_crm_sync_logs_sync_status"), table_name="crm_sync_logs")
    op.drop_index(op.f("ix_crm_sync_logs_lead_id"), table_name="crm_sync_logs")
    op.drop_table("crm_sync_logs")

    op.drop_index(op.f("ix_sales_interactions_lead_id"), table_name="sales_interactions")
    op.drop_table("sales_interactions")

    op.drop_index(op.f("ix_outreach_campaigns_campaign_status"), table_name="outreach_campaigns")
    op.drop_index(op.f("ix_outreach_campaigns_lead_id"), table_name="outreach_campaigns")
    op.drop_table("outreach_campaigns")

    op.drop_index(op.f("ix_lead_scores_lead_id"), table_name="lead_scores")
    op.drop_table("lead_scores")

    op.drop_index(op.f("ix_company_insights_lead_id"), table_name="company_insights")
    op.drop_table("company_insights")

    op.drop_index(op.f("ix_leads_owner_id"), table_name="leads")
    op.drop_index(op.f("ix_leads_lead_status"), table_name="leads")
    op.drop_index(op.f("ix_leads_company_name"), table_name="leads")
    op.drop_table("leads")

    bind = op.get_bind()
    postgresql.ENUM(*SYNC_STATUS_VALUES, name="syncstatus").drop(bind, checkfirst=True)
    postgresql.ENUM(*INTERACTION_TYPE_VALUES, name="interactiontype").drop(bind, checkfirst=True)
    postgresql.ENUM(*CAMPAIGN_STATUS_VALUES, name="campaignstatus").drop(bind, checkfirst=True)
    postgresql.ENUM(*LEAD_STATUS_VALUES, name="leadstatus").drop(bind, checkfirst=True)
