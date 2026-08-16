"""
Lead service.

Handles lead creation, retrieval, updates, deletions, and listing for the workspace.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.lead import Lead
from app.models.pipeline_enums import LeadStatus
from app.models.user import User
from app.repositories.lead_repository import LeadRepository
from app.schemas.lead import LeadCreate, LeadUpdate


class LeadService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.leads = LeadRepository(db)

    async def create_lead(self, lead_in: LeadCreate, current_user: User) -> Lead:
        lead = await self.leads.create(lead_in, owner_id=lead_in.owner_id or current_user.id)
        await self.db.commit()
        return lead

    async def get_lead(self, lead_id: uuid.UUID, current_user: User) -> Lead:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            raise NotFoundError("Lead not found.", error_code="lead_not_found")
        return lead

    async def update_lead(
        self, lead_id: uuid.UUID, lead_in: LeadUpdate, current_user: User
    ) -> Lead:
        lead = await self.get_lead(lead_id, current_user)
        updated = await self.leads.update(lead, lead_in)
        await self.db.commit()
        return updated

    async def delete_lead(self, lead_id: uuid.UUID, current_user: User) -> None:
        lead = await self.get_lead(lead_id, current_user)
        await self.leads.delete(lead)
        await self.db.commit()

    async def list_leads(
        self,
        current_user: User,
        *,
        offset: int,
        limit: int,
        status: LeadStatus | None = None,
        search: str | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> tuple[list[Lead], int]:
        return await self.leads.list_leads(
            offset=offset,
            limit=limit,
            owner_id=owner_id,
            status=status,
            search=search,
        )
