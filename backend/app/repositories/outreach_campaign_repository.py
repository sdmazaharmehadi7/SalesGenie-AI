"""
OutreachCampaign repository — data access for the `outreach_campaigns` table.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outreach_campaign import OutreachCampaign
from app.schemas.outreach_campaign import OutreachCampaignCreate, OutreachCampaignUpdate


class OutreachCampaignRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self, lead_id: uuid.UUID, campaign_in: OutreachCampaignCreate
    ) -> OutreachCampaign:
        campaign = OutreachCampaign(
            lead_id=lead_id,
            email_subject=campaign_in.email_subject,
            email_content=campaign_in.email_content,
            campaign_status=campaign_in.campaign_status,
        )
        self.db.add(campaign)
        await self.db.flush()
        await self.db.refresh(campaign)
        return campaign

    async def get_by_id(self, campaign_id: uuid.UUID) -> OutreachCampaign | None:
        return await self.db.get(OutreachCampaign, campaign_id)

    async def update(
        self, campaign: OutreachCampaign, campaign_in: OutreachCampaignUpdate
    ) -> OutreachCampaign:
        update_data = campaign_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(campaign, field, value)
        await self.db.flush()
        await self.db.refresh(campaign)
        return campaign

    async def list_for_lead(self, lead_id: uuid.UUID) -> list[OutreachCampaign]:
        result = await self.db.execute(
            select(OutreachCampaign)
            .where(OutreachCampaign.lead_id == lead_id)
            .order_by(OutreachCampaign.created_at.desc())
        )
        return list(result.scalars().all())
