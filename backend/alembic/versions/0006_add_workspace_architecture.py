"""add_workspace_architecture

Revision ID: 0006_add_workspace_architecture
Revises: 22e7336faf6b
Create Date: 2026-08-22

Introduces workspace support:
  - workspaces      : the workspace entity (personal or team)
  - workspace_memberships : join table linking users ↔ workspaces with a
                            context-specific role (manager | team_member)

Roles are NOT stored on the User model. A user's role is always
determined by their WorkspaceMembership in the current workspace context.
One user can hold different roles in different workspaces.

Does NOT touch leads, opportunities, accounts, contacts, tasks, or any
other existing CRM/AI table — those will be addressed in a later migration
once the workspace layer is validated.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_add_workspace_architecture"
down_revision: Union[str, None] = "22e7336faf6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. ENUMs
    # ------------------------------------------------------------------
    workspace_type_enum = postgresql.ENUM(
        "personal",
        "team",
        name="workspacetype",
    )
    workspace_type_enum.create(op.get_bind(), checkfirst=True)

    # Contextual role — NOT on the User model.
    # manager   : workspace creator / owner; full admin powers within the workspace
    # team_member: invited collaborator; standard access within the workspace
    workspace_role_enum = postgresql.ENUM(
        "manager",
        "team_member",
        name="workspacerole",
    )
    workspace_role_enum.create(op.get_bind(), checkfirst=True)

    # ------------------------------------------------------------------
    # 2. workspaces
    # ------------------------------------------------------------------
    op.create_table(
        "workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "type",
            postgresql.ENUM("personal", "team", name="workspacetype", create_type=False),
            nullable=False,
            server_default="team",
        ),
        # owner_id records who created the workspace; the membership row is
        # the authoritative source for the creator's role within the workspace.
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            ondelete="RESTRICT",
            name=op.f("fk_workspaces_owner_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workspaces")),
    )
    op.create_index(op.f("ix_workspaces_owner_id"), "workspaces", ["owner_id"])
    op.create_index(op.f("ix_workspaces_type"), "workspaces", ["type"])
    op.create_index(op.f("ix_workspaces_name"), "workspaces", ["name"])

    # ------------------------------------------------------------------
    # 3. workspace_memberships
    #
    # This is the authoritative source for:
    #   - which users belong to which workspace
    #   - what role they hold IN THAT workspace
    #
    # The same user can have rows with different roles in different workspaces:
    #   user A  | workspace_X | manager
    #   user A  | workspace_Y | team_member
    # ------------------------------------------------------------------
    op.create_table(
        "workspace_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM("manager", "team_member", name="workspacerole", create_type=False),
            nullable=False,
            server_default="team_member",
        ),
        sa.Column("invited_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        # joined_at is NULL while an invitation is pending (not yet accepted)
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        # status: pending | active | removed
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="active",
        ),
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
            name=op.f("fk_workspace_memberships_workspace_id"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_workspace_memberships_user_id"),
        ),
        sa.ForeignKeyConstraint(
            ["invited_by_id"],
            ["users.id"],
            ondelete="SET NULL",
            name=op.f("fk_workspace_memberships_invited_by_id"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workspace_memberships")),
        # A user may only have one active membership record per workspace
        sa.UniqueConstraint(
            "workspace_id",
            "user_id",
            name="uq_workspace_memberships_workspace_user",
        ),
    )
    op.create_index(
        op.f("ix_workspace_memberships_workspace_id"),
        "workspace_memberships",
        ["workspace_id"],
    )
    op.create_index(
        op.f("ix_workspace_memberships_user_id"),
        "workspace_memberships",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_workspace_memberships_status"),
        "workspace_memberships",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_workspace_memberships_status"), table_name="workspace_memberships")
    op.drop_index(op.f("ix_workspace_memberships_user_id"), table_name="workspace_memberships")
    op.drop_index(op.f("ix_workspace_memberships_workspace_id"), table_name="workspace_memberships")
    op.drop_table("workspace_memberships")

    op.drop_index(op.f("ix_workspaces_name"), table_name="workspaces")
    op.drop_index(op.f("ix_workspaces_type"), table_name="workspaces")
    op.drop_index(op.f("ix_workspaces_owner_id"), table_name="workspaces")
    op.drop_table("workspaces")

    postgresql.ENUM("manager", "team_member", name="workspacerole").drop(
        op.get_bind(), checkfirst=True
    )
    postgresql.ENUM("personal", "team", name="workspacetype").drop(
        op.get_bind(), checkfirst=True
    )
