"""
SalesInteraction repository — data access for the `sales_interactions` table.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales_interaction import SalesInteraction
from app.schemas.sales_interaction import SalesInteractionCreate


class SalesInteractionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self, lead_id: uuid.UUID, interaction_in: SalesInteractionCreate
    ) -> SalesInteraction:
        interaction = SalesInteraction(
            lead_id=lead_id,
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

    async def list_for_lead(self, lead_id: uuid.UUID) -> list[SalesInteraction]:
        result = await self.db.execute(
            select(SalesInteraction)
            .where(SalesInteraction.lead_id == lead_id)
            .order_by(SalesInteraction.interaction_date.desc())
        )
        return list(result.scalars().all())
