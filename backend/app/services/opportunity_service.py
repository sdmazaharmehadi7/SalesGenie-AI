"""Opportunity service — business logic for CRM Opportunities and Sales Pipeline with multi-user isolation."""

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.opportunity import Opportunity
from app.models.pipeline_enums import InteractionType, OpportunityStage
from app.models.user import User, UserRole
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.sales_interaction_repository import SalesInteractionRepository
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


def _resolve_owner_id(current_user: User, requested_owner_id: uuid.UUID | None = None) -> uuid.UUID | None:
    if current_user.role in UNRESTRICTED_ROLES:
        return requested_owner_id
    return current_user.id


class OpportunityService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.opportunities = OpportunityRepository(db)
        self.interactions = SalesInteractionRepository(db)

    async def create_opportunity(
        self, opp_in: OpportunityCreate, current_user: User
    ) -> Opportunity:
        owner_id = opp_in.owner_id if (current_user.role in UNRESTRICTED_ROLES and opp_in.owner_id) else current_user.id
        opp = await self.opportunities.create(opp_in, owner_id=owner_id)
        # Log initial creation activity
        await self.interactions.create(
            SalesInteractionCreate(
                opportunity_id=opp.id,
                account_id=opp.account_id,
                contact_id=opp.contact_id,
                lead_id=opp.lead_id,
                interaction_type=InteractionType.NOTE,
                summary=f"Opportunity created in '{STAGE_NAMES.get(opp.stage, opp.stage.value)}' stage.",
            )
        )
        await self.db.commit()
        return opp

    async def get_opportunity(self, opportunity_id: uuid.UUID, current_user: User) -> Opportunity:
        opp = await self.opportunities.get_by_id(opportunity_id)
        if opp is None:
            raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")

        # Multi-user data isolation check
        if current_user.role not in UNRESTRICTED_ROLES and opp.owner_id != current_user.id:
            raise NotFoundError("Opportunity not found.", error_code="opportunity_not_found")

        return opp

    async def update_opportunity(
        self,
        opportunity_id: uuid.UUID,
        opp_in: OpportunityUpdate,
        current_user: User,
    ) -> Opportunity:
        opp = await self.get_opportunity(opportunity_id, current_user)
        old_stage = opp.stage
        updated = await self.opportunities.update(opp, opp_in)

        if opp_in.stage is not None and opp_in.stage != old_stage:
            await self.interactions.create(
                SalesInteractionCreate(
                    opportunity_id=updated.id,
                    account_id=updated.account_id,
                    contact_id=updated.contact_id,
                    lead_id=updated.lead_id,
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
    ) -> Opportunity:
        return await self.update_opportunity(
            opportunity_id,
            OpportunityUpdate(stage=stage_in.stage),
            current_user,
        )

    async def delete_opportunity(self, opportunity_id: uuid.UUID, current_user: User) -> None:
        opp = await self.get_opportunity(opportunity_id, current_user)
        await self.opportunities.delete(opp)
        await self.db.commit()

    async def list_opportunities(
        self,
        current_user: User,
        *,
        offset: int = 0,
        limit: int = 50,
        account_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        stage: OpportunityStage | None = None,
        search: str | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> tuple[list[Opportunity], int]:
        effective_owner = _resolve_owner_id(current_user, owner_id)
        return await self.opportunities.list_opportunities(
            offset=offset,
            limit=limit,
            owner_id=effective_owner,
            account_id=account_id,
            contact_id=contact_id,
            stage=stage,
            search=search,
        )

    async def get_pipeline_board(
        self,
        current_user: User,
        owner_id: uuid.UUID | None = None,
    ) -> PipelineBoardView:
        effective_owner = _resolve_owner_id(current_user, owner_id)
        all_deals = await self.opportunities.get_pipeline_deals(owner_id=effective_owner)

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
            if not stage_enum in (OpportunityStage.WON, OpportunityStage.LOST):
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
