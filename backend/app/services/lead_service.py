"""
Lead service.

Handles lead creation, retrieval, updates, and deletions with strict
workspace-aware data isolation.

Authorization model
───────────────────
Personal Area (no workspace_id in request):
  - User sees only their own leads (workspace_id IS NULL, owner/assigned_to = user)

Workspace context — MANAGER role:
  - Full workspace lead visibility
  - Can assign / reassign leads to any workspace member
  - Can delete workspace leads

Workspace context — TEAM_MEMBER role:
  - Sees only leads assigned to them (assigned_to = user.id or owner_id = user.id)
  - Can update their assigned leads (status, notes, etc.)
  - Cannot reassign leads to other users
  - Cannot delete workspace leads
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.lead import Lead
from app.models.pipeline_enums import LeadStatus
from app.models.user import User, UserRole
from app.models.workspace import MembershipStatus, WorkspaceRole
from app.repositories.lead_repository import LeadRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.lead import LeadCreate, LeadUpdate

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class LeadService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.leads = LeadRepository(db)
        self.workspaces = WorkspaceRepository(db)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _resolve_context(
        self,
        ws_ctx: WorkspaceContext | None,
        current_user: User,
    ) -> tuple[bool, bool, uuid.UUID | None]:
        """
        Returns (is_personal, is_manager, workspace_id).
        """
        if ws_ctx is not None:
            return (
                ws_ctx.is_personal,
                ws_ctx.is_manager or current_user.role in UNRESTRICTED_ROLES,
                ws_ctx.workspace_id if not ws_ctx.is_personal else None,
            )
        # No explicit context — treat as personal area
        return True, current_user.role in UNRESTRICTED_ROLES, None

    def _is_assigned(self, lead: Lead, user_id: uuid.UUID) -> bool:
        """True when the user is the assignee of the lead (checks both fields for V1 compat)."""
        return lead.assigned_to == user_id or lead.owner_id == user_id

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    async def create_lead(
        self,
        lead_in: LeadCreate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Lead:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            # Personal area: creator = assignee = current user
            lead = await self.leads.create(
                lead_in,
                creator_id=current_user.id,
                assignee_id=current_user.id,
                workspace_id=None,
            )
        else:
            # Workspace context
            if is_manager:
                # Manager can assign to any user via assigned_to or owner_id in payload
                assignee_id = lead_in.assigned_to or lead_in.owner_id or current_user.id
            else:
                # Team member: always assigned to themselves
                assignee_id = current_user.id

            lead = await self.leads.create(
                lead_in,
                creator_id=current_user.id,
                assignee_id=assignee_id,
                workspace_id=workspace_id,
            )

        await self.db.commit()
        return lead

    async def get_lead(
        self,
        lead_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Lead:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            raise NotFoundError("Lead not found.", error_code="lead_not_found")

        if ws_ctx is not None:
            is_personal = ws_ctx.is_personal
            is_manager = ws_ctx.is_manager or current_user.role in UNRESTRICTED_ROLES

            if is_personal:
                # Personal area: lead must have NULL workspace_id and belong to user
                if lead.workspace_id is not None:
                    raise NotFoundError("Lead not found.", error_code="lead_not_found")
                if (
                    current_user.role not in UNRESTRICTED_ROLES
                    and not self._is_assigned(lead, current_user.id)
                ):
                    raise NotFoundError("Lead not found.", error_code="lead_not_found")
            else:
                # Workspace context: lead must belong to this workspace
                if lead.workspace_id != ws_ctx.workspace_id:
                    raise NotFoundError("Lead not found.", error_code="lead_not_found")
                # Team members can only access their assigned leads
                if not is_manager and not self._is_assigned(lead, current_user.id):
                    raise NotFoundError("Lead not found.", error_code="lead_not_found")
        else:
            # No ws_ctx — fallback for internal service-to-service calls
            if lead.workspace_id is None:
                # Personal area
                if (
                    current_user.role not in UNRESTRICTED_ROLES
                    and not self._is_assigned(lead, current_user.id)
                ):
                    raise NotFoundError("Lead not found.", error_code="lead_not_found")
            else:
                # Workspace lead — verify membership
                if current_user.role not in UNRESTRICTED_ROLES:
                    membership = await self.workspaces.get_membership(
                        lead.workspace_id, current_user.id
                    )
                    if membership is None or membership.status != MembershipStatus.ACTIVE.value:
                        raise NotFoundError("Lead not found.", error_code="lead_not_found")
                    if (
                        membership.role != WorkspaceRole.MANAGER
                        and not self._is_assigned(lead, current_user.id)
                    ):
                        raise NotFoundError("Lead not found.", error_code="lead_not_found")

        return lead

    async def update_lead(
        self,
        lead_id: uuid.UUID,
        lead_in: LeadUpdate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Lead:
        lead = await self.get_lead(lead_id, current_user, ws_ctx=ws_ctx)

        is_personal, is_manager, _ = self._resolve_context(ws_ctx, current_user)

        # Team member restriction: cannot reassign lead to another user
        if not is_personal and not is_manager:
            requested_assignee = lead_in.assigned_to or lead_in.owner_id
            if requested_assignee is not None and not self._is_assigned(lead, requested_assignee):
                raise ForbiddenError(
                    "Team members cannot reassign leads to other users.",
                    error_code="reassign_forbidden",
                )

        updated = await self.leads.update(lead, lead_in)
        await self.db.commit()
        return updated

    async def delete_lead(
        self,
        lead_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> None:
        lead = await self.get_lead(lead_id, current_user, ws_ctx=ws_ctx)

        is_personal, is_manager, _ = self._resolve_context(ws_ctx, current_user)

        # Workspace leads: only managers may delete
        if not is_personal and not is_manager:
            raise ForbiddenError(
                "Only workspace managers can delete workspace leads.",
                error_code="delete_forbidden",
            )

        await self.leads.delete(lead)
        await self.db.commit()

    async def list_leads(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        *,
        offset: int = 0,
        limit: int = 20,
        status: LeadStatus | None = None,
        search: str | None = None,
        owner_id: uuid.UUID | None = None,  # legacy filter param kept for API compat
    ) -> tuple[list[Lead], int]:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            # Personal area: always scoped to current user (unless admin override)
            effective_assignee = (
                owner_id if current_user.role in UNRESTRICTED_ROLES else current_user.id
            )
            return await self.leads.list_leads(
                offset=offset,
                limit=limit,
                assigned_to=effective_assignee,
                workspace_id=None,
                is_personal=True,
                status=status,
                search=search,
            )
        else:
            # Workspace context
            if is_manager:
                # Manager sees all workspace leads; optional filter by a specific rep
                effective_assignee = owner_id  # None = no filter (see all)
            else:
                # Team member sees only their assigned leads
                effective_assignee = current_user.id

            return await self.leads.list_leads(
                offset=offset,
                limit=limit,
                assigned_to=effective_assignee,
                workspace_id=workspace_id,
                is_personal=False,
                status=status,
                search=search,
            )
