"""add_workspace_invitations

Revision ID: 0007_add_workspace_invitations
Revises: 0006_add_workspace_architecture
Create Date: 2026-08-22

Introduces the workspace_invitations table:
  - Inviting users by email to team workspaces
  - Tracking invitation tokens, roles, and status (pending, accepted, rejected, cancelled, expired)
  - Preserving invitations when users do not yet have an account
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_add_workspace_invitations"
down_revision: Union[str, None] = "0006_add_workspace_architecture"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Create workspace_invitations table
    # ------------------------------------------------------------------
    op.create_table(
        "workspace_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token", sa.String(length=128), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM("manager", "team_member", name="workspacerole", create_type=False),
            nullable=False,
            server_default="team_member",
        ),
        sa.Column("invited_by_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
            name=op.f("fk_workspace_invitations_workspace_id"),
        ),
        sa.ForeignKeyConstraint(
            ["invited_by_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_workspace_invitations_invited_by_id"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workspace_invitations")),
        sa.UniqueConstraint("token", name="uq_workspace_invitations_token"),
    )
    op.create_index(op.f("ix_workspace_invitations_workspace_id"), "workspace_invitations", ["workspace_id"])
    op.create_index(op.f("ix_workspace_invitations_email"), "workspace_invitations", ["email"])
    op.create_index(op.f("ix_workspace_invitations_token"), "workspace_invitations", ["token"], unique=True)
    op.create_index(op.f("ix_workspace_invitations_status"), "workspace_invitations", ["status"])


def downgrade() -> None:
    op.drop_index(op.f("ix_workspace_invitations_status"), table_name="workspace_invitations")
    op.drop_index(op.f("ix_workspace_invitations_token"), table_name="workspace_invitations")
    op.drop_index(op.f("ix_workspace_invitations_email"), table_name="workspace_invitations")
    op.drop_index(op.f("ix_workspace_invitations_workspace_id"), table_name="workspace_invitations")
    op.drop_table("workspace_invitations")
