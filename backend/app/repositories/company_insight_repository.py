"""
CompanyInsight repository — data access for the `company_insights` table.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company_insight import CompanyInsight
from app.schemas.company_insight import CompanyInsightCreate


class CompanyInsightRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, lead_id: uuid.UUID, insight_in: CompanyInsightCreate) -> CompanyInsight:
        insight = CompanyInsight(
            lead_id=lead_id,
            business_needs=insight_in.business_needs,
            opportunities=insight_in.opportunities,
            industry_analysis=insight_in.industry_analysis,
        )
        self.db.add(insight)
        await self.db.flush()
        await self.db.refresh(insight)
        return insight

    async def get_latest_for_lead(self, lead_id: uuid.UUID) -> CompanyInsight | None:
        result = await self.db.execute(
            select(CompanyInsight)
            .where(CompanyInsight.lead_id == lead_id)
            .order_by(CompanyInsight.generated_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_for_lead(self, lead_id: uuid.UUID) -> list[CompanyInsight]:
        result = await self.db.execute(
            select(CompanyInsight)
            .where(CompanyInsight.lead_id == lead_id)
            .order_by(CompanyInsight.generated_at.desc())
        )
        return list(result.scalars().all())
