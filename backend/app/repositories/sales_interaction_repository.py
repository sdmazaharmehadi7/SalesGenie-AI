"""
SalesInteraction repository — data access for the `sales_interactions` (Activities) table.
"""

import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales_interaction import SalesInteraction
from app.schemas.sales_interaction import SalesInteractionCreate


class SalesInteractionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        interaction_in: SalesInteractionCreate,
        lead_id: uuid.UUID | None = None,
    ) -> SalesInteraction:
        interaction = SalesInteraction(
            lead_id=interaction_in.lead_id or lead_id,
            contact_id=interaction_in.contact_id,
            account_id=interaction_in.account_id,
            opportunity_id=interaction_in.opportunity_id,
            interaction_type=interaction_in.interaction_type,
            summary=interaction_in.summary,
            action_items=interaction_in.action_items,
        )
        self.db.add(interaction)
        await self.db.flush()
        await self.db.refresh(interaction)
        return interaction

    async def get_by_id(self, interaction_id: uuid.UUID) -> SalesInteraction | None:
        return await self.db.get(SalesInteraction, interaction_id)

    async def list_for_entity(
        self,
        *,
        lead_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        opportunity_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[SalesInteraction]:
        query = select(SalesInteraction)
        filters = []
        if lead_id:
            filters.append(SalesInteraction.lead_id == lead_id)
        if contact_id:
            filters.append(SalesInteraction.contact_id == contact_id)
        if account_id:
            filters.append(SalesInteraction.account_id == account_id)
        if opportunity_id:
            filters.append(SalesInteraction.opportunity_id == opportunity_id)

        if filters:
            query = query.where(or_(*filters))

        query = query.order_by(SalesInteraction.interaction_date.desc()).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_for_lead(self, lead_id: uuid.UUID) -> list[SalesInteraction]:
        return await self.list_for_entity(lead_id=lead_id)

    async def list_recent(self, limit: int = 20) -> list[SalesInteraction]:
        result = await self.db.execute(
            select(SalesInteraction)
            .order_by(SalesInteraction.interaction_date.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
