"""Opportunity repository — data access for the `opportunities` table."""

import uuid
from decimal import Decimal

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.opportunity import Opportunity
from app.models.pipeline_enums import OpportunityStage
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate


class OpportunityRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, opportunity_id: uuid.UUID) -> Opportunity | None:
        return await self.db.get(Opportunity, opportunity_id)

    async def create(
        self,
        opp_in: OpportunityCreate,
        owner_id: uuid.UUID | None,
        workspace_id: uuid.UUID | None = None,
    ) -> Opportunity:
        is_won = opp_in.stage == OpportunityStage.WON
        is_closed = opp_in.stage in (OpportunityStage.WON, OpportunityStage.LOST)
        opp = Opportunity(
            name=opp_in.name,
            amount=opp_in.amount,
            stage=opp_in.stage,
            probability=opp_in.probability if opp_in.probability is not None else (100 if is_won else (0 if opp_in.stage == OpportunityStage.LOST else 20)),
            expected_close_date=opp_in.expected_close_date,
            notes=opp_in.notes,
            is_closed=is_closed,
            is_won=is_won,
            account_id=opp_in.account_id,
            contact_id=opp_in.contact_id,
            lead_id=opp_in.lead_id,
            owner_id=opp_in.owner_id if opp_in.owner_id is not None else owner_id,
            workspace_id=opp_in.workspace_id if opp_in.workspace_id is not None else workspace_id,
        )
        self.db.add(opp)
        await self.db.flush()
        await self.db.refresh(opp)
        return opp

    async def update(self, opp: Opportunity, opp_in: OpportunityUpdate) -> Opportunity:
        update_data = opp_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(opp, field, value)

        if "stage" in update_data and update_data["stage"] is not None:
            new_stage = update_data["stage"]
            opp.is_closed = new_stage in (OpportunityStage.WON, OpportunityStage.LOST)
            opp.is_won = new_stage == OpportunityStage.WON
            if new_stage == OpportunityStage.WON and "probability" not in update_data:
                opp.probability = 100
            elif new_stage == OpportunityStage.LOST and "probability" not in update_data:
                opp.probability = 0

        await self.db.flush()
        await self.db.refresh(opp)
        return opp

    async def delete(self, opp: Opportunity) -> None:
        await self.db.delete(opp)
        await self.db.flush()

    async def list_opportunities(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        owner_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
        account_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        stage: OpportunityStage | None = None,
        search: str | None = None,
    ) -> tuple[list[Opportunity], int]:
        filters: list[ColumnElement[bool]] = []
        if is_personal:
            filters.append(Opportunity.workspace_id.is_(None))
        elif workspace_id is not None:
            filters.append(Opportunity.workspace_id == workspace_id)

        if owner_id is not None:
            filters.append(Opportunity.owner_id == owner_id)
        if account_id is not None:
            filters.append(Opportunity.account_id == account_id)
        if contact_id is not None:
            filters.append(Opportunity.contact_id == contact_id)
        if stage is not None:
            filters.append(Opportunity.stage == stage)
        if search:
            like_pattern = f"%{search}%"
            filters.append(
                or_(
                    Opportunity.name.ilike(like_pattern),
                    Opportunity.notes.ilike(like_pattern),
                )
            )

        base_query = select(Opportunity)
        count_query = select(func.count()).select_from(Opportunity)
        for condition in filters:
            base_query = base_query.where(condition)
            count_query = count_query.where(condition)

        total = (await self.db.execute(count_query)).scalar_one()

        result = await self.db.execute(
            base_query.order_by(Opportunity.updated_at.desc()).offset(offset).limit(limit)
        )
        opportunities = list(result.scalars().all())
        return opportunities, total

    async def get_pipeline_deals(
        self,
        owner_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
    ) -> list[Opportunity]:
        query = select(Opportunity)
        if is_personal:
            query = query.where(Opportunity.workspace_id.is_(None))
        elif workspace_id is not None:
            query = query.where(Opportunity.workspace_id == workspace_id)

        if owner_id is not None:
            query = query.where(Opportunity.owner_id == owner_id)
        result = await self.db.execute(query.order_by(Opportunity.updated_at.desc()))
        return list(result.scalars().all())

    async def get_metrics(
        self,
        owner_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
    ) -> dict:
        filters: list[ColumnElement[bool]] = []
        if is_personal:
            filters.append(Opportunity.workspace_id.is_(None))
        elif workspace_id is not None:
            filters.append(Opportunity.workspace_id == workspace_id)

        if owner_id is not None:
            filters.append(Opportunity.owner_id == owner_id)

        # Open opportunities
        open_cond = [Opportunity.is_closed == False] + filters  # noqa: E712
        open_res = await self.db.execute(
            select(
                func.count(Opportunity.id),
                func.coalesce(func.sum(Opportunity.amount), 0),
            ).where(*open_cond)
        )
        open_count, pipeline_value = open_res.one()

        # Won opportunities
        won_cond = [Opportunity.stage == OpportunityStage.WON] + filters
        won_res = await self.db.execute(
            select(
                func.count(Opportunity.id),
                func.coalesce(func.sum(Opportunity.amount), 0),
            ).where(*won_cond)
        )
        won_count, won_revenue = won_res.one()

        # Lost opportunities
        lost_cond = [Opportunity.stage == OpportunityStage.LOST] + filters
        lost_res = await self.db.execute(
            select(
                func.count(Opportunity.id),
                func.coalesce(func.sum(Opportunity.amount), 0),
            ).where(*lost_cond)
        )
        lost_count, lost_revenue = lost_res.one()

        total_closed = won_count + lost_count
        win_rate = (won_count / total_closed * 100.0) if total_closed > 0 else 0.0

        return {
            "open_count": open_count,
            "pipeline_value": Decimal(str(pipeline_value)),
            "won_count": won_count,
            "won_revenue": Decimal(str(won_revenue)),
            "lost_count": lost_count,
            "lost_revenue": Decimal(str(lost_revenue)),
            "win_rate": round(win_rate, 2),
            "total_closed": total_closed,
        }
