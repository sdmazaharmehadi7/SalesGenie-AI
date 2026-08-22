"""Activity service — unified timeline & activity management with workspace isolation."""

import uuid

from sqlalchemy import ColumnElement, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.models.account import Account
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.sales_interaction import SalesInteraction
from app.models.user import User, UserRole
from app.repositories.sales_interaction_repository import SalesInteractionRepository
from app.schemas.sales_interaction import SalesInteractionCreate

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class ActivityService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.interactions = SalesInteractionRepository(db)

    def _resolve_context(
        self,
        ws_ctx: WorkspaceContext | None,
        current_user: User | None,
    ) -> tuple[bool, bool, uuid.UUID | None]:
        """Returns (is_personal, is_manager, workspace_id)."""
        if ws_ctx is not None:
            is_manager = ws_ctx.is_manager or (current_user is not None and current_user.role in UNRESTRICTED_ROLES)
            return (
                ws_ctx.is_personal,
                is_manager,
                ws_ctx.workspace_id if not ws_ctx.is_personal else None,
            )
        is_manager = current_user is not None and current_user.role in UNRESTRICTED_ROLES
        return True, is_manager, None

    async def log_activity(
        self,
        activity_in: SalesInteractionCreate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> SalesInteraction:
        is_personal, _, workspace_id = self._resolve_context(ws_ctx, current_user)

        target_workspace_id = None if is_personal else (activity_in.workspace_id or workspace_id)
        interaction = await self.interactions.create(
            activity_in,
            workspace_id=target_workspace_id,
            user_id=current_user.id,
        )
        await self.db.commit()
        return interaction

    async def get_timeline(
        self,
        current_user: User | None = None,
        ws_ctx: WorkspaceContext | None = None,
        *,
        lead_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        opportunity_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[SalesInteraction]:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        # If specific entity is requested
        if lead_id or contact_id or account_id or opportunity_id:
            return await self.interactions.list_for_entity(
                lead_id=lead_id,
                contact_id=contact_id,
                account_id=account_id,
                opportunity_id=opportunity_id,
                workspace_id=workspace_id,
                is_personal=is_personal,
                limit=limit,
            )

        # General timeline
        if not is_personal and workspace_id is not None:
            if is_manager:
                return await self.interactions.list_recent(
                    workspace_id=workspace_id,
                    is_personal=False,
                    limit=limit,
                )
            else:
                user_id = current_user.id if current_user else None
                return await self.interactions.list_recent(
                    workspace_id=workspace_id,
                    is_personal=False,
                    user_id=user_id,
                    limit=limit,
                )

        # Personal area / default timeline
        if current_user and current_user.role not in UNRESTRICTED_ROLES:
            user_lead_ids = select(Lead.id).where(Lead.owner_id == current_user.id)
            user_opp_ids = select(Opportunity.id).where(Opportunity.owner_id == current_user.id)
            user_acc_ids = select(Account.id).where(Account.owner_id == current_user.id)
            user_con_ids = select(Contact.id).where(Contact.owner_id == current_user.id)

            act_query = (
                select(SalesInteraction)
                .where(
                    or_(
                        SalesInteraction.user_id == current_user.id,
                        SalesInteraction.lead_id.in_(user_lead_ids),
                        SalesInteraction.opportunity_id.in_(user_opp_ids),
                        SalesInteraction.account_id.in_(user_acc_ids),
                        SalesInteraction.contact_id.in_(user_con_ids),
                    )
                )
                .order_by(SalesInteraction.interaction_date.desc())
                .limit(limit)
            )
            act_result = await self.db.execute(act_query)
            return list(act_result.scalars().all())

        return await self.interactions.list_recent(limit=limit)

    async def get_recent_activities(self, limit: int = 20) -> list[SalesInteraction]:
        return await self.interactions.list_recent(limit=limit)
