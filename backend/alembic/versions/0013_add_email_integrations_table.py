"""add_email_integrations_table

Revision ID: 0013_add_email_integrations
Revises: 0012_add_follow_up_fields
Create Date: 2026-09-05

Adds email_integrations table for user-level OAuth credentials (Gmail).
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0013_add_email_integrations"
down_revision: Union[str, None] = "0012_add_follow_up_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use existing or create enum types safely via raw SQL DO block
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE emailprovidertype AS ENUM ('GMAIL', 'OUTLOOK');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE integrationstatus AS ENUM ('CONNECTED', 'DISCONNECTED', 'REVOKED', 'EXPIRED', 'ERROR');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.create_table(
        "email_integrations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("provider", postgresql.ENUM("GMAIL", "OUTLOOK", name="emailprovidertype", create_type=False), server_default="GMAIL", nullable=False),
        sa.Column("provider_email", sa.String(length=255), nullable=False),
        sa.Column("access_token_encrypted", sa.Text(), nullable=False),
        sa.Column("refresh_token_encrypted", sa.Text(), nullable=True),
        sa.Column("token_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", postgresql.ENUM("CONNECTED", "DISCONNECTED", "REVOKED", "EXPIRED", "ERROR", name="integrationstatus", create_type=False), server_default="CONNECTED", nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error_message", sa.Text(), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_email_integrations_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_email_integrations")),
        sa.UniqueConstraint("user_id", "provider", name="uq_user_email_provider"),
    )
    op.create_index(op.f("ix_email_integrations_user_id"), "email_integrations", ["user_id"], unique=False)
    op.create_index(op.f("ix_email_integrations_provider"), "email_integrations", ["provider"], unique=False)
    op.create_index(op.f("ix_email_integrations_status"), "email_integrations", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_email_integrations_status"), table_name="email_integrations")
    op.drop_index(op.f("ix_email_integrations_provider"), table_name="email_integrations")
    op.drop_index(op.f("ix_email_integrations_user_id"), table_name="email_integrations")
    op.drop_table("email_integrations")

    bind = op.get_bind()
    postgresql.ENUM("CONNECTED", "DISCONNECTED", "REVOKED", "EXPIRED", "ERROR", name="integrationstatus").drop(bind, checkfirst=True)
    postgresql.ENUM("GMAIL", "OUTLOOK", name="emailprovidertype").drop(bind, checkfirst=True)
