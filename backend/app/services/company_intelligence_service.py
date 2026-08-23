"""
Company Intelligence service (Module 4: Lead Intelligence & Company
Analysis).

Orchestrates: load the lead -> call the AI provider -> validate the
result against `CompanyInsightCreate` -> persist via the repository.
This is the "Company Profile Analysis" / "Analytics Engine" node in the
architecture diagram.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.integrations.ai.base import AIProvider
from app.models.company_insight import CompanyInsight
from app.repositories.company_insight_repository import CompanyInsightRepository
from app.schemas.company_insight import CompanyInsightCreate
from app.services.lead_service import LeadService


class CompanyIntelligenceService:
    def __init__(self, db: AsyncSession, ai_provider: AIProvider) -> None:
        self.db = db
        self.ai_provider = ai_provider
        self.insights = CompanyInsightRepository(db)
        self.lead_service = LeadService(db)

    async def generate_insight(
        self,
        lead_id: uuid.UUID,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> CompanyInsight:
        lead = await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)

        raw_result = await self.ai_provider.generate_company_insight(
            company_name=lead.company_name,
            industry=lead.industry,
            contact_name=lead.contact_name,
        )
        insight_in = CompanyInsightCreate.model_validate(raw_result)

        insight = await self.insights.create(lead.id, insight_in)
        await self.db.commit()
        return insight

    async def get_latest_insight(
        self,
        lead_id: uuid.UUID,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> CompanyInsight | None:
        await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)  # enforces access control
        return await self.insights.get_latest_for_lead(lead_id)

    async def list_insights(
        self,
        lead_id: uuid.UUID,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> list[CompanyInsight]:
        await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)
        return await self.insights.list_for_lead(lead_id)
