"""
Lead Scoring service (Module 6: Lead Scoring & Recommendation Engine).

Reuses the lead's latest `CompanyInsight` (if one exists) as context for
scoring, since a scored lead is usually more accurate once its business
needs/opportunities are already known — matching the architecture
diagram's data flow (Company Profile Analysis -> AI Lead Scoring Engine).
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.integrations.ai.base import AIProvider
from app.models.lead_score import LeadScore
from app.repositories.company_insight_repository import CompanyInsightRepository
from app.repositories.lead_score_repository import LeadScoreRepository
from app.schemas.lead_score import LeadScoreCreate
from app.services.lead_service import LeadService


class LeadScoringService:
    def __init__(self, db: AsyncSession, ai_provider: AIProvider) -> None:
        self.db = db
        self.ai_provider = ai_provider
        self.scores = LeadScoreRepository(db)
        self.insights = CompanyInsightRepository(db)
        self.lead_service = LeadService(db)

    async def generate_score(
        self,
        lead_id: uuid.UUID,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> LeadScore:
        lead = await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)
        latest_insight = await self.insights.get_latest_for_lead(lead.id)

        insight_dict = None
        if latest_insight is not None:
            insight_dict = {
                "business_needs": latest_insight.business_needs,
                "opportunities": latest_insight.opportunities,
                "industry_analysis": latest_insight.industry_analysis,
            }

        raw_result = await self.ai_provider.generate_lead_score(
            company_name=lead.company_name,
            industry=lead.industry,
            insight=insight_dict,
        )
        score_in = LeadScoreCreate.model_validate(raw_result)

        score = await self.scores.create(lead.id, score_in)
        await self.db.commit()
        return score

    async def get_latest_score(
        self,
        lead_id: uuid.UUID,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> LeadScore | None:
        await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)
        return await self.scores.get_latest_for_lead(lead_id)

    async def list_scores(
        self,
        lead_id: uuid.UUID,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> list[LeadScore]:
        await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)
        return await self.scores.list_for_lead(lead_id)
