"""
Lead repository.

The only place that issues SQLAlchemy queries against the `leads` table.
Supports the filtering/pagination the Lead Management module's list
endpoint needs (by status, by owner, free-text search on company name).
"""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.models.pipeline_enums import LeadStatus
from app.schemas.lead import LeadCreate, LeadUpdate


class LeadRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, lead_id: uuid.UUID) -> Lead | None:
        return await self.db.get(Lead, lead_id)

    async def create(self, lead_in: LeadCreate, owner_id: uuid.UUID | None) -> Lead:
        lead = Lead(
            company_name=lead_in.company_name,
            industry=lead_in.industry,
            contact_name=lead_in.contact_name,
            email=lead_in.email,
            phone=lead_in.phone,
            deal_value=lead_in.deal_value,
            lead_status=lead_in.lead_status,
            owner_id=lead_in.owner_id if lead_in.owner_id is not None else owner_id,
        )
        self.db.add(lead)
        await self.db.flush()
        await self.db.refresh(lead)
        return lead

    async def update(self, lead: Lead, lead_in: LeadUpdate) -> Lead:
        update_data = lead_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(lead, field, value)
        await self.db.flush()
        await self.db.refresh(lead)
        return lead

    async def delete(self, lead: Lead) -> None:
        await self.db.delete(lead)
        await self.db.flush()

    async def list_leads(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        owner_id: uuid.UUID | None = None,
        status: LeadStatus | None = None,
        search: str | None = None,
    ) -> tuple[list[Lead], int]:
        """
        Returns `(page_of_leads, total_matching_count)`. The count query
        mirrors the same filters as the page query so pagination metadata
        (`total`, `page_count`) stays accurate.
        """
        filters = []
        if owner_id is not None:
            filters.append(Lead.owner_id == owner_id)
        if status is not None:
            filters.append(Lead.lead_status == status)
        if search:
            like_pattern = f"%{search}%"
            filters.append(
                or_(Lead.company_name.ilike(like_pattern), Lead.contact_name.ilike(like_pattern))
            )

        base_query = select(Lead)
        count_query = select(func.count()).select_from(Lead)
        for condition in filters:
            base_query = base_query.where(condition)
            count_query = count_query.where(condition)

        total = (await self.db.execute(count_query)).scalar_one()

        result = await self.db.execute(
            base_query.order_by(Lead.updated_at.desc()).offset(offset).limit(limit)
        )
        leads = list(result.scalars().all())
        return leads, total
