"""
LeadScore repository — data access for the `lead_scores` table.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead_score import LeadScore
from app.schemas.lead_score import LeadScoreCreate


class LeadScoreRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, lead_id: uuid.UUID, score_in: LeadScoreCreate) -> LeadScore:
        score = LeadScore(
            lead_id=lead_id,
            lead_score=score_in.lead_score,
            conversion_probability=score_in.conversion_probability,
        )
        self.db.add(score)
        await self.db.flush()
        await self.db.refresh(score)
        return score

    async def get_latest_for_lead(self, lead_id: uuid.UUID) -> LeadScore | None:
        result = await self.db.execute(
            select(LeadScore)
            .where(LeadScore.lead_id == lead_id)
            .order_by(LeadScore.generated_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_for_lead(self, lead_id: uuid.UUID) -> list[LeadScore]:
        result = await self.db.execute(
            select(LeadScore).where(LeadScore.lead_id == lead_id).order_by(LeadScore.generated_at.desc())
        )
        return list(result.scalars().all())
