"""Opportunity service — business logic for CRM Opportunities and Sales Pipeline with workspace isolation."""

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.opportunity import Opportunity
from app.models.pipeline_enums import InteractionType, OpportunityStage
from app.models.user import User, UserRole
from app.models.workspace import MembershipStatus, WorkspaceRole
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.sales_interaction_repository import SalesInteractionRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityListItem,
    OpportunityStageUpdate,
    OpportunityUpdate,
    PipelineBoardView,
    PipelineColumn,
)
from app.schemas.sales_interaction import SalesInteractionCreate

STAGE_NAMES = {
    OpportunityStage.NEW: "New",
    OpportunityStage.QUALIFIED: "Qualified",
    OpportunityStage.DEMO: "Demo Scheduled",
    OpportunityStage.PROPOSAL: "Proposal Sent",
    OpportunityStage.NEGOTIATION: "Negotiation",
    OpportunityStage.WON: "Closed Won",
    OpportunityStage.LOST: "Closed Lost",
}

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class OpportunityService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.opportunities = OpportunityRepository(db)
        self.interactions = SalesInteractionRepository(db)
        self.workspaces = WorkspaceRepository(db)

    def _resolve_context(
        self,
        ws_ctx: WorkspaceContext | None,
        current_user: User,
    ) -> tuple[bool, bool, uuid.UUID | None]:
        """Returns (is_personal, is_manager, workspace_id)."""
        if ws_ctx is not None:
            return (
                ws_ctx.is_personal,
                ws_ctx.is_manager or current_user.role in UNRESTRICTED_ROLES,
                ws_ctx.workspace_id if not ws_ctx.is_personal else None,
            )
        return True, current_user.role in UNRESTRICTED_ROLES, None

    async def create_opportunity(
        self,
        opp_in: OpportunityCreate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Opportunity:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            owner_id = current_user.id if current_user.role not in UNRESTRICTED_ROLES else (opp_in.owner_id or current_user.id)
            opp = await self.opportunities.create(opp_in, owner_id=owner_id, workspace_id=None)
        else:
            owner_id = opp_in.owner_id if is_manager and opp_in.owner_id else current_user.id
            opp = await self.opportunities.create(opp_in, owner_id=owner_id, workspace_id=workspace_id)

        # Log initial creation activity
        await self.interactions.create(
            SalesInteractionCreate(
                opportunity_id=opp.id,
                account_id=opp.account_id,
                contact_id=opp.contact_id,
                lead_id=opp.lead_id,
                workspace_id=opp.workspace_id,
                user_id=current_user.id,
                interaction_type=InteractionType.NOTE,
                summary=f"Opportunity created in '{STAGE_NAMES.get(opp.stage, opp.stage.value)}' stage.",
            )
        )
        await self.db.commit()
        return opp

    async def get_opportunity(
        self,
        opportunity_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Opportunity:
        opp = await self.opportunities.get_by_id(opportunity_id)
        if opp is None:
            raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")

        if ws_ctx is not None:
            is_personal = ws_ctx.is_personal
            is_manager = ws_ctx.is_manager or current_user.role in UNRESTRICTED_ROLES

            if is_personal:
                if opp.workspace_id is not None:
                    raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")
                if current_user.role not in UNRESTRICTED_ROLES and opp.owner_id != current_user.id:
                    raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")
            else:
                if opp.workspace_id != ws_ctx.workspace_id:
                    raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")
                if not is_manager and opp.owner_id != current_user.id:
                    raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")
        else:
            # Fallback for callers without explicit ws_ctx
            if opp.workspace_id is None:
                if current_user.role not in UNRESTRICTED_ROLES and opp.owner_id != current_user.id:
                    raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")
            else:
                if current_user.role not in UNRESTRICTED_ROLES:
                    membership = await self.workspaces.get_membership(opp.workspace_id, current_user.id)
                    if membership is None or membership.status != MembershipStatus.ACTIVE.value:
                        raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")
                    if membership.role != WorkspaceRole.MANAGER and opp.owner_id != current_user.id:
                        raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")

        return opp

    async def update_opportunity(
        self,
        opportunity_id: uuid.UUID,
        opp_in: OpportunityUpdate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Opportunity:
        opp = await self.get_opportunity(opportunity_id, current_user, ws_ctx=ws_ctx)
        old_stage = opp.stage
        updated = await self.opportunities.update(opp, opp_in)

        if opp_in.stage is not None and opp_in.stage != old_stage:
            await self.interactions.create(
                SalesInteractionCreate(
                    opportunity_id=updated.id,
                    account_id=updated.account_id,
                    contact_id=updated.contact_id,
                    lead_id=updated.lead_id,
                    workspace_id=updated.workspace_id,
                    user_id=current_user.id,
                    interaction_type=InteractionType.STAGE_CHANGE,
                    summary=f"Deal stage changed from {STAGE_NAMES.get(old_stage, old_stage.value)} to {STAGE_NAMES.get(updated.stage, updated.stage.value)}.",
                )
            )

        await self.db.commit()
        return updated

    async def update_stage(
        self,
        opportunity_id: uuid.UUID,
        stage_in: OpportunityStageUpdate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Opportunity:
        return await self.update_opportunity(
            opportunity_id,
            OpportunityUpdate(stage=stage_in.stage),
            current_user,
            ws_ctx=ws_ctx,
        )

    async def delete_opportunity(
        self,
        opportunity_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> None:
        opp = await self.get_opportunity(opportunity_id, current_user, ws_ctx=ws_ctx)

        is_personal, is_manager, _ = self._resolve_context(ws_ctx, current_user)
        if not is_personal and not is_manager:
            raise ForbiddenError(
                "Only workspace managers can delete workspace opportunities.",
                error_code="delete_forbidden",
            )

        await self.opportunities.delete(opp)
        await self.db.commit()

    async def list_opportunities(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        *,
        offset: int = 0,
        limit: int = 50,
        account_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        stage: OpportunityStage | None = None,
        search: str | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> tuple[list[Opportunity], int]:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            effective_owner = owner_id if current_user.role in UNRESTRICTED_ROLES else current_user.id
            return await self.opportunities.list_opportunities(
                offset=offset,
                limit=limit,
                owner_id=effective_owner,
                workspace_id=None,
                is_personal=True,
                account_id=account_id,
                contact_id=contact_id,
                stage=stage,
                search=search,
            )
        else:
            effective_owner = owner_id if is_manager else current_user.id
            return await self.opportunities.list_opportunities(
                offset=offset,
                limit=limit,
                owner_id=effective_owner,
                workspace_id=workspace_id,
                is_personal=False,
                account_id=account_id,
                contact_id=contact_id,
                stage=stage,
                search=search,
            )

    async def get_pipeline_board(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> PipelineBoardView:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            effective_owner = owner_id if current_user.role in UNRESTRICTED_ROLES else current_user.id
            all_deals = await self.opportunities.get_pipeline_deals(
                owner_id=effective_owner,
                workspace_id=None,
                is_personal=True,
            )
        else:
            effective_owner = owner_id if is_manager else current_user.id
            all_deals = await self.opportunities.get_pipeline_deals(
                owner_id=effective_owner,
                workspace_id=workspace_id,
                is_personal=False,
            )

        # Group by stage
        stage_map: dict[OpportunityStage, list[OpportunityListItem]] = {
            s: [] for s in OpportunityStage
        }
        for deal in all_deals:
            stage_map[deal.stage].append(OpportunityListItem.model_validate(deal))

        columns = []
        total_val = Decimal("0")
        total_count = len(all_deals)

        for stage_enum in OpportunityStage:
            items = stage_map[stage_enum]
            col_amount = sum((d.amount or Decimal("0")) for d in items)
            if stage_enum not in (OpportunityStage.WON, OpportunityStage.LOST):
                total_val += col_amount
            columns.append(
                PipelineColumn(
                    stage=stage_enum,
                    stage_name=STAGE_NAMES.get(stage_enum, stage_enum.value),
                    opportunities=items,
                    total_amount=col_amount,
                    count=len(items),
                )
            )

        return PipelineBoardView(
            columns=columns,
            total_pipeline_value=total_val,
            total_deals_count=total_count,
        )
