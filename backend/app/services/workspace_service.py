"""
Workspace service — business logic layer.

Handles all workspace and membership operations. Route handlers stay thin;
they delegate here for all "what does it mean to" logic.

Security model
──────────────
Every method that operates on a specific workspace first verifies that the
calling user has an ACTIVE membership in that workspace (via _require_membership).
Role-gated methods additionally check that the membership role is MANAGER.
This ensures no backend operation bypasses the access check, regardless of
what the frontend sends.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationAppError
from app.models.user import User
from app.models.workspace import (
    InvitationStatus,
    MembershipStatus,
    Workspace,
    WorkspaceInvitation,
    WorkspaceMembership,
    WorkspaceRole,
    WorkspaceType,
)
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate


class WorkspaceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = WorkspaceRepository(db)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _require_membership(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> WorkspaceMembership:
        """
        Resolve and return the ACTIVE membership for this user in this workspace.
        Raises 404 if the workspace doesn't exist, 403 if the user is not a member.
        This is the primary access gate for all workspace-scoped operations.
        """
        workspace = await self.repo.get_by_id(workspace_id)
        if workspace is None or not workspace.is_active:
            raise NotFoundError("Workspace not found.", error_code="workspace_not_found")

        membership = await self.repo.get_membership(workspace_id, user_id)
        if membership is None or membership.status != MembershipStatus.ACTIVE.value:
            raise ForbiddenError(
                "You are not a member of this workspace.",
                error_code="not_a_member",
            )
        return membership

    async def _require_manager(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> WorkspaceMembership:
        """Same as _require_membership but also asserts the caller is a MANAGER."""
        membership = await self._require_membership(workspace_id, user_id)
        if membership.role != WorkspaceRole.MANAGER:
            raise ForbiddenError(
                "Only workspace managers can perform this action.",
                error_code="insufficient_workspace_role",
            )
        return membership

    # ------------------------------------------------------------------
    # Workspace lifecycle
    # ------------------------------------------------------------------

    async def create_workspace(
        self,
        data: WorkspaceCreate,
        current_user: User,
    ) -> tuple[Workspace, WorkspaceMembership]:
        """
        Create a team workspace and immediately add the creator as MANAGER.
        Returns (workspace, membership) so the endpoint can build both responses.
        """
        workspace = await self.repo.create_workspace(data, owner_id=current_user.id)
        membership = await self.repo.create_membership(
            workspace_id=workspace.id,
            user_id=current_user.id,
            role=WorkspaceRole.MANAGER,
        )
        await self.db.commit()
        await self.db.refresh(workspace)
        await self.db.refresh(membership)
        return workspace, membership

    async def bootstrap_personal_workspace(self, user: User) -> Workspace:
        """
        Idempotent — creates a PERSONAL workspace for a user if they don't
        already have one. Called by auth_service.register after user creation.
        """
        # Check if personal workspace already exists for this user
        existing = await self.repo.get_user_memberships(user.id)
        personal = next(
            (m for m in existing if m.workspace.type == WorkspaceType.PERSONAL),
            None,
        )
        if personal is not None:
            return personal.workspace

        workspace = await self.repo.create_personal_workspace(
            owner_id=user.id,
            name=f"{user.name}'s Personal Area",
        )
        await self.repo.create_membership(
            workspace_id=workspace.id,
            user_id=user.id,
            role=WorkspaceRole.MANAGER,
        )
        return workspace

    async def get_workspace(
        self,
        workspace_id: uuid.UUID,
        current_user: User,
    ) -> tuple[Workspace, WorkspaceMembership]:
        """Get workspace details; verifies the caller is an active member."""
        membership = await self._require_membership(workspace_id, current_user.id)
        workspace = await self.repo.get_by_id(workspace_id)
        return workspace, membership

    async def update_workspace(
        self,
        workspace_id: uuid.UUID,
        data: WorkspaceUpdate,
        current_user: User,
    ) -> Workspace:
        """Update workspace name/description; requires MANAGER role."""
        await self._require_manager(workspace_id, current_user.id)
        workspace = await self.repo.get_by_id(workspace_id)
        updated = await self.repo.update_workspace(workspace, data)
        await self.db.commit()
        await self.db.refresh(updated)
        return updated

    # ------------------------------------------------------------------
    # Member listing
    # ------------------------------------------------------------------

    async def list_user_workspaces(
        self,
        current_user: User,
    ) -> list[tuple[WorkspaceMembership, int]]:
        """
        Return all workspaces the calling user actively belongs to,
        each paired with its current member count.
        """
        memberships = await self.repo.get_user_memberships(current_user.id)
        result = []
        for m in memberships:
            count = await self.repo.count_active_members(m.workspace_id)
            result.append((m, count))
        return result

    async def list_workspace_members(
        self,
        workspace_id: uuid.UUID,
        current_user: User,
    ) -> list[WorkspaceMembership]:
        """List all active members of a workspace; any member can call this."""
        await self._require_membership(workspace_id, current_user.id)
        return await self.repo.get_workspace_members(workspace_id)

    # ------------------------------------------------------------------
    # Membership management (manager-only)
    # ------------------------------------------------------------------

    async def add_member(
        self,
        workspace_id: uuid.UUID,
        target_user_id: uuid.UUID,
        role: WorkspaceRole,
        current_user: User,
    ) -> WorkspaceMembership:
        """
        Add a user directly to a workspace (e.g. invited by a manager).
        The target user must exist (caller must resolve the user_id beforehand).
        Raises 409 if the user is already an active member.
        """
        await self._require_manager(workspace_id, current_user.id)

        existing = await self.repo.get_membership(workspace_id, target_user_id)
        if existing is not None and existing.status == MembershipStatus.ACTIVE.value:
            raise ConflictError(
                "This user is already a member of the workspace.",
                error_code="already_a_member",
            )

        membership = await self.repo.create_membership(
            workspace_id=workspace_id,
            user_id=target_user_id,
            role=role,
            invited_by_id=current_user.id,
        )
        await self.db.commit()
        await self.db.refresh(membership)
        return membership

    async def update_member_role(
        self,
        workspace_id: uuid.UUID,
        target_user_id: uuid.UUID,
        new_role: WorkspaceRole,
        current_user: User,
    ) -> WorkspaceMembership:
        """
        Change a member's role within the workspace.
        Only a MANAGER may do this.
        Cannot demote yourself if you are the only remaining manager.
        """
        await self._require_manager(workspace_id, current_user.id)

        target = await self.repo.get_membership(workspace_id, target_user_id)
        if target is None or target.status != MembershipStatus.ACTIVE.value:
            raise NotFoundError("Member not found.", error_code="member_not_found")

        # Safety: prevent stranding a workspace with no managers
        if (
            target.role == WorkspaceRole.MANAGER
            and new_role == WorkspaceRole.TEAM_MEMBER
        ):
            manager_count = await self.repo.count_managers(workspace_id)
            if manager_count <= 1:
                raise ValidationAppError(
                    "Cannot demote the last manager. Promote another member first.",
                    error_code="last_manager",
                )

        updated = await self.repo.update_membership_role(target, new_role)
        await self.db.commit()
        await self.db.refresh(updated)
        return updated

    async def remove_member(
        self,
        workspace_id: uuid.UUID,
        target_user_id: uuid.UUID,
        current_user: User,
    ) -> None:
        """
        Remove a member from the workspace (manager-only).
        Cannot remove yourself via this endpoint — use leave_workspace instead.
        Cannot remove the last manager.
        """
        await self._require_manager(workspace_id, current_user.id)

        if target_user_id == current_user.id:
            raise ValidationAppError(
                "Use the leave endpoint to remove yourself from a workspace.",
                error_code="use_leave_endpoint",
            )

        target = await self.repo.get_membership(workspace_id, target_user_id)
        if target is None or target.status != MembershipStatus.ACTIVE.value:
            raise NotFoundError("Member not found.", error_code="member_not_found")

        if target.role == WorkspaceRole.MANAGER:
            manager_count = await self.repo.count_managers(workspace_id)
            if manager_count <= 1:
                raise ValidationAppError(
                    "Cannot remove the last manager.",
                    error_code="last_manager",
                )

        await self.repo.remove_membership(target)
        await self.db.commit()

    async def leave_workspace(
        self,
        workspace_id: uuid.UUID,
        current_user: User,
    ) -> None:
        """
        Let the calling user leave a workspace.
        Cannot leave a personal workspace.
        Cannot leave if you are the last manager (must promote someone first).
        """
        membership = await self._require_membership(workspace_id, current_user.id)
        workspace = await self.repo.get_by_id(workspace_id)

        if workspace.type == WorkspaceType.PERSONAL:
            raise ValidationAppError(
                "You cannot leave your personal workspace.",
                error_code="cannot_leave_personal",
            )

        if membership.role == WorkspaceRole.MANAGER:
            manager_count = await self.repo.count_managers(workspace_id)
            if manager_count <= 1:
                raise ValidationAppError(
                    "You are the last manager. Promote another member before leaving.",
                    error_code="last_manager",
                )

        await self.repo.remove_membership(membership)
        await self.db.commit()

    # ------------------------------------------------------------------
    # Context switch (stateless — just a verification + role lookup)
    # ------------------------------------------------------------------

    async def get_context(
        self,
        workspace_id: uuid.UUID,
        current_user: User,
    ) -> tuple[Workspace, WorkspaceMembership]:
        """
        Verify the user belongs to the workspace and return the context data.
        The frontend uses this to confirm a workspace switch is valid and to
        persist the workspace_id + role locally.
        No server-side session is stored.
        """
        membership = await self._require_membership(workspace_id, current_user.id)
        workspace = await self.repo.get_by_id(workspace_id)
        return workspace, membership

    # ------------------------------------------------------------------
    # Invitation Lifecycle
    # ------------------------------------------------------------------

    async def invite_user_by_email(
        self,
        workspace_id: uuid.UUID,
        email: str,
        role: WorkspaceRole,
        current_user: User,
    ) -> WorkspaceInvitation:
        """
        Manager generates an invitation for a user by email.

        If the invited user does not yet have an account, the invitation is
        safely stored as PENDING. They can register at any time and accept it.
        """
        await self._require_manager(workspace_id, current_user.id)
        workspace = await self.repo.get_by_id(workspace_id)

        if workspace.type == WorkspaceType.PERSONAL:
            raise ValidationAppError(
                "You cannot invite members to a personal workspace.",
                error_code="cannot_invite_to_personal",
            )

        clean_email = email.strip().lower()
        if clean_email == current_user.email.lower():
            raise ValidationAppError(
                "You cannot invite yourself to this workspace.",
                error_code="cannot_invite_self",
            )

        # Check if user already exists and is already an active member
        user_repo = UserRepository(self.db)
        existing_user = await user_repo.get_by_email(clean_email)
        if existing_user:
            existing_member = await self.repo.get_membership(workspace_id, existing_user.id)
            if existing_member and existing_member.status == MembershipStatus.ACTIVE.value:
                raise ConflictError(
                    "This user is already an active member of this workspace.",
                    error_code="already_a_member",
                )

        # Check for existing active pending invitation
        existing_invite = await self.repo.get_pending_invitation(workspace_id, clean_email)
        if existing_invite is not None:
            # Re-issue with refreshed expiry and token
            existing_invite.token = secrets.token_urlsafe(32)
            existing_invite.role = role
            existing_invite.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            await self.db.commit()
            await self.db.refresh(existing_invite)
            return existing_invite

        # Create brand new invitation
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        invitation = await self.repo.create_invitation(
            workspace_id=workspace_id,
            email=clean_email,
            token=token,
            role=role,
            invited_by_id=current_user.id,
            expires_at=expires_at,
        )
        await self.db.commit()
        # Eagerly reload relationships
        reloaded = await self.repo.get_invitation_by_id(invitation.id)
        return reloaded or invitation

    async def list_workspace_invitations(
        self,
        workspace_id: uuid.UUID,
        current_user: User,
    ) -> list[WorkspaceInvitation]:
        """Manager views pending invitations for a workspace."""
        await self._require_manager(workspace_id, current_user.id)
        return await self.repo.get_workspace_invitations(
            workspace_id,
            status=InvitationStatus.PENDING.value,
        )

    async def cancel_invitation(
        self,
        workspace_id: uuid.UUID,
        invitation_id: uuid.UUID,
        current_user: User,
    ) -> None:
        """Manager cancels a pending invitation."""
        await self._require_manager(workspace_id, current_user.id)

        invitation = await self.repo.get_invitation_by_id(invitation_id)
        if invitation is None or invitation.workspace_id != workspace_id:
            raise NotFoundError("Invitation not found.", error_code="invitation_not_found")

        if invitation.status != InvitationStatus.PENDING.value:
            raise ValidationAppError(
                "Only pending invitations can be cancelled.",
                error_code="invitation_not_pending",
            )

        await self.repo.update_invitation_status(invitation, InvitationStatus.CANCELLED.value)
        await self.db.commit()

    async def list_my_pending_invitations(
        self,
        current_user: User,
    ) -> list[WorkspaceInvitation]:
        """
        Invited user retrieves all pending, non-expired invitations matching their email.
        Works seamlessly for both existing users and users who just registered.
        """
        return await self.repo.get_pending_invitations_for_email(current_user.email)

    async def get_invitation_by_token(
        self,
        token: str,
    ) -> WorkspaceInvitation:
        """Inspect invitation details by token (e.g. for join workspace modal)."""
        invitation = await self.repo.get_invitation_by_token(token)
        if (
            invitation is None
            or invitation.status != InvitationStatus.PENDING.value
            or invitation.expires_at <= datetime.now(timezone.utc)
        ):
            raise NotFoundError(
                "Invitation is invalid, expired, or no longer active.",
                error_code="invitation_invalid",
            )
        return invitation

    async def accept_invitation(
        self,
        token: str,
        current_user: User,
    ) -> tuple[Workspace, WorkspaceMembership]:
        """
        Invited user accepts an invitation by token.
        Creates/activates their WorkspaceMembership as TEAM_MEMBER, marks invitation ACCEPTED.
        """
        invitation = await self.repo.get_invitation_by_token(token)
        if (
            invitation is None
            or invitation.status != InvitationStatus.PENDING.value
            or invitation.expires_at <= datetime.now(timezone.utc)
        ):
            raise ValidationAppError(
                "This invitation is invalid, expired, or has already been used.",
                error_code="invitation_invalid_or_expired",
            )

        # Ensure the user's email matches the invitation
        if invitation.email.lower() != current_user.email.lower():
            raise ForbiddenError(
                f"This invitation was sent to {invitation.email}. "
                f"Please log in with that account to accept it.",
                error_code="invitation_email_mismatch",
            )

        workspace = await self.repo.get_by_id(invitation.workspace_id)
        if workspace is None or not workspace.is_active:
            raise NotFoundError("The workspace for this invitation no longer exists.", error_code="workspace_not_found")

        # Check existing membership
        existing_member = await self.repo.get_membership(invitation.workspace_id, current_user.id)
        if existing_member is not None:
            if existing_member.status == MembershipStatus.ACTIVE.value:
                membership = existing_member
            else:
                existing_member.status = MembershipStatus.ACTIVE.value
                existing_member.role = invitation.role
                existing_member.joined_at = datetime.now(timezone.utc)
                membership = existing_member
        else:
            membership = await self.repo.create_membership(
                workspace_id=invitation.workspace_id,
                user_id=current_user.id,
                role=invitation.role,
                invited_by_id=invitation.invited_by_id,
                status=MembershipStatus.ACTIVE.value,
            )

        # Mark invitation accepted
        await self.repo.update_invitation_status(
            invitation,
            InvitationStatus.ACCEPTED.value,
            accepted_at=datetime.now(timezone.utc),
        )
        await self.db.commit()
        await self.db.refresh(membership)
        await self.db.refresh(workspace)
        return workspace, membership

    async def reject_invitation(
        self,
        token: str,
        current_user: User,
    ) -> None:
        """Invited user rejects/declines an invitation."""
        invitation = await self.repo.get_invitation_by_token(token)
        if (
            invitation is None
            or invitation.status != InvitationStatus.PENDING.value
            or invitation.expires_at <= datetime.now(timezone.utc)
        ):
            raise ValidationAppError(
                "This invitation is invalid or no longer active.",
                error_code="invitation_invalid",
            )

        if invitation.email.lower() != current_user.email.lower():
            raise ForbiddenError(
                "You do not have permission to reject this invitation.",
                error_code="invitation_email_mismatch",
            )

        await self.repo.update_invitation_status(
            invitation,
            InvitationStatus.REJECTED.value,
        )
        await self.db.commit()
