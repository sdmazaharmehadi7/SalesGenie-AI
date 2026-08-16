"""Activity service — unified timeline & activity management."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales_interaction import SalesInteraction
from app.models.user import User
from app.repositories.sales_interaction_repository import SalesInteractionRepository
from app.schemas.sales_interaction import SalesInteractionCreate


class ActivityService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.interactions = SalesInteractionRepository(db)

    async def log_activity(
        self,
        activity_in: SalesInteractionCreate,
        current_user: User,
    ) -> SalesInteraction:
        interaction = await self.interactions.create(activity_in)
        await self.db.commit()
        return interaction

    async def get_timeline(
        self,
        *,
        lead_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        opportunity_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[SalesInteraction]:
        return await self.interactions.list_for_entity(
            lead_id=lead_id,
            contact_id=contact_id,
            account_id=account_id,
            opportunity_id=opportunity_id,
            limit=limit,
        )

    async def get_recent_activities(self, limit: int = 20) -> list[SalesInteraction]:
        return await self.interactions.list_recent(limit=limit)
