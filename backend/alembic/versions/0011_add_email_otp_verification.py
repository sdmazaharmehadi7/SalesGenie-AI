"""add_email_otp_verification

Revision ID: 0011_add_email_otp_verification
Revises: 0010_workspace_crm
Create Date: 2026-08-28

Adds is_email_verified to users table, and creates email_otps table
for single-use verification codes.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_add_email_otp_verification"
down_revision: Union[str, None] = "0010_workspace_crm"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add is_email_verified column to users
    op.add_column(
        "users",
        sa.Column("is_email_verified", sa.Boolean(), server_default="false", nullable=False),
    )

    # 2. Existing accounts created before OTP system are grandfathered as verified
    op.execute("UPDATE users SET is_email_verified = true")

    # 3. Create email_otps table
    op.create_table(
        "email_otps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("otp_code", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_used", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_email_otps_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_email_otps")),
    )
    op.create_index(op.f("ix_email_otps_email"), "email_otps", ["email"], unique=False)
    op.create_index(op.f("ix_email_otps_user_id"), "email_otps", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_email_otps_user_id"), table_name="email_otps")
    op.drop_index(op.f("ix_email_otps_email"), table_name="email_otps")
    op.drop_table("email_otps")
    op.drop_column("users", "is_email_verified")
