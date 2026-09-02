"""
Workspace repository — the only place that issues SQL against
workspaces and workspace_memberships.

Services call into this layer; they never build queries themselves.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.workspace import (
    MembershipStatus,
    Workspace,
    WorkspaceMembership,
    WorkspaceRole,
    WorkspaceType,
)
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate


class WorkspaceRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Workspace CRUD
    # ------------------------------------------------------------------

    async def get_by_id(self, workspace_id: uuid.UUID) -> Workspace | None:
        """Fetch a single workspace with its memberships eagerly loaded."""
        result = await self.db.execute(
            select(Workspace)
            .where(Workspace.id == workspace_id)
            .options(selectinload(Workspace.memberships))
        )
        return result.scalar_one_or_none()

    async def create_workspace(
        self,
        data: WorkspaceCreate,
        owner_id: uuid.UUID,
    ) -> Workspace:
        """
        Create the workspace row.
        The caller (WorkspaceService) is responsible for also inserting the
        owner's WorkspaceMembership row in the same transaction.
        """
        workspace = Workspace(
            name=data.name,
            description=data.description,
            type=data.type,
            owner_id=owner_id,
            is_active=True,
        )
        self.db.add(workspace)
        await self.db.flush()
        await self.db.refresh(workspace)
        return workspace

    async def create_personal_workspace(self, owner_id: uuid.UUID, name: str) -> Workspace:
        """
        Bootstrap a personal workspace for a newly-registered user.
        Called by auth_service.register after user creation.
        """
        workspace = Workspace(
            name=name,
            description="Your personal workspace",
            type=WorkspaceType.PERSONAL,
            owner_id=owner_id,
            is_active=True,
        )
        self.db.add(workspace)
        await self.db.flush()
        await self.db.refresh(workspace)
        return workspace

    async def update_workspace(
        self,
        workspace: Workspace,
        data: WorkspaceUpdate,
    ) -> Workspace:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workspace, field, value)
        await self.db.flush()
        await self.db.refresh(workspace)
        return workspace

    # ------------------------------------------------------------------
    # Membership
    # ------------------------------------------------------------------

    async def get_membership(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> WorkspaceMembership | None:
        """Return the membership row for a specific (workspace, user) pair."""
        result = await self.db.execute(
            select(WorkspaceMembership).where(
                and_(
                    WorkspaceMembership.workspace_id == workspace_id,
                    WorkspaceMembership.user_id == user_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_user_memberships(
        self,
        user_id: uuid.UUID,
        *,
        status: str = MembershipStatus.ACTIVE.value,
    ) -> list[WorkspaceMembership]:
        """
        Return all memberships for a user filtered by status.
        Each membership has the Workspace eagerly loaded so callers can
        read workspace.name / workspace.type without extra queries.
        """
        result = await self.db.execute(
            select(WorkspaceMembership)
            .where(
                and_(
                    WorkspaceMembership.user_id == user_id,
                    WorkspaceMembership.status == status,
                )
            )
            .options(selectinload(WorkspaceMembership.workspace))
            .order_by(WorkspaceMembership.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_workspace_members(
        self,
        workspace_id: uuid.UUID,
    ) -> list[WorkspaceMembership]:
        """
        Return all ACTIVE membership rows for a workspace.
        Each row has the User eagerly loaded for display fields.
        """
        result = await self.db.execute(
            select(WorkspaceMembership)
            .where(
                and_(
                    WorkspaceMembership.workspace_id == workspace_id,
                    WorkspaceMembership.status == MembershipStatus.ACTIVE.value,
                )
            )
            .options(selectinload(WorkspaceMembership.user))
            .order_by(WorkspaceMembership.created_at.asc())
        )
        return list(result.scalars().all())

    async def create_membership(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        role: WorkspaceRole,
        *,
        invited_by_id: uuid.UUID | None = None,
        status: str = MembershipStatus.ACTIVE.value,
    ) -> WorkspaceMembership:
        """
        Insert a new membership row.
        joined_at is set to now for ACTIVE memberships; left NULL for PENDING.
        """
        now = datetime.now(timezone.utc)
        membership = WorkspaceMembership(
            workspace_id=workspace_id,
            user_id=user_id,
            role=role,
            invited_by_id=invited_by_id,
            status=status,
            joined_at=now if status == MembershipStatus.ACTIVE.value else None,
        )
        self.db.add(membership)
        await self.db.flush()
        await self.db.refresh(membership)
        return membership

    async def update_membership_role(
        self,
        membership: WorkspaceMembership,
        new_role: WorkspaceRole,
    ) -> WorkspaceMembership:
        membership.role = new_role
        await self.db.flush()
        await self.db.refresh(membership)
        return membership

    async def remove_membership(self, membership: WorkspaceMembership) -> None:
        """
        Soft-delete: mark the membership as REMOVED rather than deleting the row,
        so audit history is preserved.
        """
        membership.status = MembershipStatus.REMOVED.value
        await self.db.flush()

    async def count_active_members(self, workspace_id: uuid.UUID) -> int:
        """Returns how many ACTIVE members are in a workspace."""
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count())
            .select_from(WorkspaceMembership)
            .where(
                and_(
                    WorkspaceMembership.workspace_id == workspace_id,
                    WorkspaceMembership.status == MembershipStatus.ACTIVE.value,
                )
            )
        )
        return result.scalar_one()

    async def count_managers(self, workspace_id: uuid.UUID) -> int:
        """Returns how many ACTIVE managers remain in a workspace."""
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count())
            .select_from(WorkspaceMembership)
            .where(
                and_(
                    WorkspaceMembership.workspace_id == workspace_id,
                    WorkspaceMembership.role == WorkspaceRole.MANAGER,
                    WorkspaceMembership.status == MembershipStatus.ACTIVE.value,
                )
            )
        )
        return result.scalar_one()

    # ------------------------------------------------------------------
    # Invitations
    # ------------------------------------------------------------------

    async def create_invitation(
        self,
        workspace_id: uuid.UUID,
        email: str,
        token: str,
        role: WorkspaceRole,
        invited_by_id: uuid.UUID,
        expires_at: datetime,
    ) -> "WorkspaceInvitation":
        from app.models.workspace import InvitationStatus, WorkspaceInvitation

        invitation = WorkspaceInvitation(
            workspace_id=workspace_id,
            email=email.strip().lower(),
            token=token,
            role=role,
            invited_by_id=invited_by_id,
            status=InvitationStatus.PENDING.value,
            expires_at=expires_at,
        )
        self.db.add(invitation)
        await self.db.flush()
        await self.db.refresh(invitation)
        return invitation

    async def get_invitation_by_id(self, invitation_id: uuid.UUID) -> "WorkspaceInvitation | None":
        from app.models.workspace import WorkspaceInvitation

        result = await self.db.execute(
            select(WorkspaceInvitation)
            .where(WorkspaceInvitation.id == invitation_id)
            .options(
                selectinload(WorkspaceInvitation.workspace),
                selectinload(WorkspaceInvitation.invited_by),
            )
        )
        return result.scalar_one_or_none()

    async def get_invitation_by_token(self, token: str) -> "WorkspaceInvitation | None":
        from app.models.workspace import WorkspaceInvitation

        result = await self.db.execute(
            select(WorkspaceInvitation)
            .where(WorkspaceInvitation.token == token.strip())
            .options(
                selectinload(WorkspaceInvitation.workspace),
                selectinload(WorkspaceInvitation.invited_by),
            )
        )
        return result.scalar_one_or_none()

    async def get_any_invitation(
        self,
        workspace_id: uuid.UUID,
        email: str,
    ) -> "WorkspaceInvitation | None":
        """Find most recent invitation for a specific workspace and email regardless of status."""
        from app.models.workspace import WorkspaceInvitation

        result = await self.db.execute(
            select(WorkspaceInvitation)
            .where(
                and_(
                    WorkspaceInvitation.workspace_id == workspace_id,
                    WorkspaceInvitation.email == email.strip().lower(),
                )
            )
            .options(
                selectinload(WorkspaceInvitation.workspace),
                selectinload(WorkspaceInvitation.invited_by),
            )
            .order_by(WorkspaceInvitation.created_at.desc())
        )
        return result.scalars().first()

    async def get_pending_invitation(
        self,
        workspace_id: uuid.UUID,
        email: str,
    ) -> "WorkspaceInvitation | None":
        """Find active/non-expired pending invitation for a specific workspace and email."""
        from app.models.workspace import InvitationStatus, WorkspaceInvitation

        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(WorkspaceInvitation).where(
                and_(
                    WorkspaceInvitation.workspace_id == workspace_id,
                    WorkspaceInvitation.email == email.strip().lower(),
                    WorkspaceInvitation.status == InvitationStatus.PENDING.value,
                    WorkspaceInvitation.expires_at > now,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_workspace_invitations(
        self,
        workspace_id: uuid.UUID,
        *,
        status: str | None = None,
    ) -> list["WorkspaceInvitation"]:
        """List invitations for a workspace, optionally filtered by status."""
        from app.models.workspace import WorkspaceInvitation

        query = (
            select(WorkspaceInvitation)
            .where(WorkspaceInvitation.workspace_id == workspace_id)
            .options(
                selectinload(WorkspaceInvitation.workspace),
                selectinload(WorkspaceInvitation.invited_by),
            )
            .order_by(WorkspaceInvitation.created_at.desc())
        )
        if status:
            query = query.where(WorkspaceInvitation.status == status)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_pending_invitations_for_email(
        self,
        email: str,
    ) -> list["WorkspaceInvitation"]:
        """List all pending, non-expired invitations for an email address."""
        from app.models.workspace import InvitationStatus, WorkspaceInvitation

        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(WorkspaceInvitation)
            .where(
                and_(
                    WorkspaceInvitation.email == email.strip().lower(),
                    WorkspaceInvitation.status == InvitationStatus.PENDING.value,
                    WorkspaceInvitation.expires_at > now,
                )
            )
            .options(
                selectinload(WorkspaceInvitation.workspace),
                selectinload(WorkspaceInvitation.invited_by),
            )
            .order_by(WorkspaceInvitation.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_invitation_status(
        self,
        invitation: "WorkspaceInvitation",
        status: str,
        *,
        accepted_at: datetime | None = None,
    ) -> "WorkspaceInvitation":
        invitation.status = status
        if accepted_at is not None:
            invitation.accepted_at = accepted_at
        await self.db.flush()
        await self.db.refresh(invitation)
        return invitation
