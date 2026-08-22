"""
Workspace ORM models.

Introduces three closely related concepts:

WorkspaceType  — whether a workspace is a personal solo area or a team workspace.
WorkspaceRole  — the role a user holds WITHIN a specific workspace.
               Roles are NOT global; they live on WorkspaceMembership, not on User.

Workspace           — the workspace entity itself.
WorkspaceMembership — the join table that connects a User to a Workspace,
                      recording their contextual role and membership status.

Key design invariants
─────────────────────
1. Roles are contextual.
   The same user can be:
     manager    in Workspace A  (they created it)
     team_member in Workspace B  (they were invited)

2. User.role (the global legacy column) is NOT the authority here.
   All workspace-level permission checks must consult WorkspaceMembership.role
   for the active workspace, not User.role.

3. Workspace creator bootstrap.
   When a workspace is created, the service layer MUST insert a
   WorkspaceMembership row with role=WorkspaceRole.MANAGER for the creator.
   workspace.owner_id is a denormalised convenience field; the membership
   row is the single source of truth for the creator's role.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin, generated_at_column
from app.models.user import User


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class WorkspaceType(str, enum.Enum):
    """Whether the workspace is a personal solo area or a shared team space."""

    PERSONAL = "personal"
    TEAM = "team"


class WorkspaceRole(str, enum.Enum):
    """
    Contextual role within a single workspace.

    manager     — workspace creator or promoted member; can invite/remove members,
                  rename the workspace, and access management features.
    team_member — invited collaborator; standard CRM access within the workspace.
    """

    MANAGER = "manager"
    TEAM_MEMBER = "team_member"


class MembershipStatus(str, enum.Enum):
    """Lifecycle state of a workspace membership record."""

    PENDING = "pending"    # invitation sent, not yet accepted
    ACTIVE = "active"      # user has joined
    REMOVED = "removed"    # kicked or left; kept for audit purposes


class InvitationStatus(str, enum.Enum):
    """Lifecycle state of a workspace invitation record."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


# ---------------------------------------------------------------------------
# Workspace
# ---------------------------------------------------------------------------


class Workspace(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    A named context that groups users and (eventually) their CRM data together.

    owner_id is a denormalised reference to the user who originally created
    the workspace. It exists for quick ownership checks and UI display.
    The authoritative role for that user is stored in their WorkspaceMembership.
    """

    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    type: Mapped[WorkspaceType] = mapped_column(
        Enum(
            WorkspaceType,
            name="workspacetype",
            native_enum=True,
            values_callable=lambda e: [x.value for x in e],
        ),
        nullable=False,
        default=WorkspaceType.TEAM,
        server_default=WorkspaceType.TEAM.value,
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    # Relationships
    owner: Mapped[User] = relationship(
        "User",
        foreign_keys=[owner_id],
        lazy="joined",
    )
    memberships: Mapped[list["WorkspaceMembership"]] = relationship(
        "WorkspaceMembership",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
    invitations: Mapped[list["WorkspaceInvitation"]] = relationship(
        "WorkspaceInvitation",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Workspace id={self.id} name={self.name!r} type={self.type.value}>"


# ---------------------------------------------------------------------------
# WorkspaceMembership
# ---------------------------------------------------------------------------


class WorkspaceMembership(Base, UUIDPrimaryKeyMixin):
    """
    Join table: User ↔ Workspace with a contextual role.

    This is the single source of truth for:
      • which users belong to which workspace
      • what role each user holds IN THAT workspace
      • the lifecycle state of their membership (pending / active / removed)

    Uniqueness: one row per (workspace_id, user_id) pair — enforced by
    the DB-level unique constraint uq_workspace_memberships_workspace_user.
    """

    __tablename__ = "workspace_memberships"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role: Mapped[WorkspaceRole] = mapped_column(
        Enum(
            WorkspaceRole,
            name="workspacerole",
            native_enum=True,
            values_callable=lambda e: [x.value for x in e],
        ),
        nullable=False,
        default=WorkspaceRole.TEAM_MEMBER,
        server_default=WorkspaceRole.TEAM_MEMBER.value,
    )

    # Who sent the invitation (NULL for the workspace creator's bootstrap row)
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # NULL while membership is still in PENDING state (invitation not yet accepted)
    joined_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=MembershipStatus.ACTIVE.value,
        server_default=MembershipStatus.ACTIVE.value,
        index=True,
    )

    created_at: Mapped[datetime] = generated_at_column()

    # Relationships
    workspace: Mapped["Workspace"] = relationship(
        "Workspace",
        back_populates="memberships",
    )
    user: Mapped[User] = relationship(
        "User",
        foreign_keys=[user_id],
        lazy="joined",
    )
    invited_by: Mapped[User | None] = relationship(
        "User",
        foreign_keys=[invited_by_id],
    )

    # Convenience helpers -------------------------------------------------------

    @property
    def is_manager(self) -> bool:
        return self.role == WorkspaceRole.MANAGER

    @property
    def is_active_member(self) -> bool:
        return self.status == MembershipStatus.ACTIVE.value

    def __repr__(self) -> str:
        return (
            f"<WorkspaceMembership workspace={self.workspace_id} "
            f"user={self.user_id} role={self.role.value} status={self.status}>"
        )


# ---------------------------------------------------------------------------
# WorkspaceInvitation
# ---------------------------------------------------------------------------


class WorkspaceInvitation(Base, UUIDPrimaryKeyMixin):
    """
    Invitation issued by a workspace manager to an email address.

    Preserved across user registration: If an invited email has no SalesGenie
    account yet, the invitation remains PENDING with their email. Once registered,
    the user can accept or reject the invitation.
    """

    __tablename__ = "workspace_invitations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    token: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        Enum(
            WorkspaceRole,
            name="workspacerole",
            native_enum=True,
            values_callable=lambda e: [x.value for x in e],
        ),
        nullable=False,
        default=WorkspaceRole.TEAM_MEMBER,
        server_default=WorkspaceRole.TEAM_MEMBER.value,
    )
    invited_by_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=InvitationStatus.PENDING.value,
        server_default=InvitationStatus.PENDING.value,
        index=True,
    )
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = generated_at_column()

    # Relationships
    workspace: Mapped["Workspace"] = relationship(
        "Workspace",
        back_populates="invitations",
    )
    invited_by: Mapped[User] = relationship(
        "User",
        foreign_keys=[invited_by_id],
        lazy="joined",
    )

    @property
    def is_pending(self) -> bool:
        return self.status == InvitationStatus.PENDING.value

    def __repr__(self) -> str:
        return (
            f"<WorkspaceInvitation id={self.id} workspace={self.workspace_id} "
            f"email={self.email!r} role={self.role.value} status={self.status}>"
        )
