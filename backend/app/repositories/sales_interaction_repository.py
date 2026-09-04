"""
SalesInteraction repository — data access for the `sales_interactions` (Activities) table.
"""

import uuid

from sqlalchemy import ColumnElement, or_, select
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
        workspace_id: uuid.UUID | None = None,
        user_id: uuid.UUID | None = None,
    ) -> SalesInteraction:
        kwargs = {}
        if interaction_in.interaction_date is not None:
            kwargs["interaction_date"] = interaction_in.interaction_date


        interaction = SalesInteraction(
            lead_id=interaction_in.lead_id or lead_id,
            contact_id=interaction_in.contact_id,
            account_id=interaction_in.account_id,
            opportunity_id=interaction_in.opportunity_id,
            interaction_type=interaction_in.interaction_type,
            summary=interaction_in.summary,
            action_items=interaction_in.action_items,
            workspace_id=interaction_in.workspace_id if interaction_in.workspace_id is not None else workspace_id,
            user_id=interaction_in.user_id if interaction_in.user_id is not None else user_id,
            **kwargs,
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
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
        limit: int = 50,
    ) -> list[SalesInteraction]:
        query = select(SalesInteraction)
        entity_filters: list[ColumnElement[bool]] = []
        if lead_id:
            entity_filters.append(SalesInteraction.lead_id == lead_id)
        if contact_id:
            entity_filters.append(SalesInteraction.contact_id == contact_id)
        if account_id:
            entity_filters.append(SalesInteraction.account_id == account_id)
        if opportunity_id:
            entity_filters.append(SalesInteraction.opportunity_id == opportunity_id)

        if entity_filters:
            query = query.where(or_(*entity_filters))

        if is_personal:
            query = query.where(SalesInteraction.workspace_id.is_(None))
        elif workspace_id is not None:
            query = query.where(SalesInteraction.workspace_id == workspace_id)

        query = query.order_by(SalesInteraction.interaction_date.desc()).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_for_lead(self, lead_id: uuid.UUID) -> list[SalesInteraction]:
        return await self.list_for_entity(lead_id=lead_id)

    async def list_recent(
        self,
        *,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
        user_id: uuid.UUID | None = None,
        limit: int = 20,
    ) -> list[SalesInteraction]:
        query = select(SalesInteraction)
        if is_personal:
            query = query.where(SalesInteraction.workspace_id.is_(None))
        elif workspace_id is not None:
            query = query.where(SalesInteraction.workspace_id == workspace_id)

        if user_id is not None:
            query = query.where(SalesInteraction.user_id == user_id)

        result = await self.db.execute(
            query.order_by(SalesInteraction.interaction_date.desc()).limit(limit)
        )
        return list(result.scalars().all())
