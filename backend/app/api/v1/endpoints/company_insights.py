"""
Lead Intelligence & Company Analysis endpoints (Module 4).

Nested under a lead (`/leads/{lead_id}/insights`), since an insight only
ever makes sense in the context of one lead — there is no standalone
"list all insights" use case in the product.
"""

import uuid

from fastapi import APIRouter, status

from app.api.deps import AIProviderDep, CurrentActiveUser, DBSession
from app.core.exceptions import NotFoundError
from app.schemas.company_insight import CompanyInsightRead
from app.services.company_intelligence_service import CompanyIntelligenceService

router = APIRouter()


@router.post(
    "/{lead_id}/insights/generate",
    response_model=CompanyInsightRead,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new AI company-insight snapshot for a lead",
)
async def generate_insight(
    lead_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser, ai_provider: AIProviderDep
) -> CompanyInsightRead:
    insight = await CompanyIntelligenceService(db, ai_provider).generate_insight(lead_id, current_user)
    return CompanyInsightRead.model_validate(insight)


@router.get(
    "/{lead_id}/insights/latest",
    response_model=CompanyInsightRead,
    summary="Get the most recent company insight for a lead",
)
async def get_latest_insight(
    lead_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser, ai_provider: AIProviderDep
) -> CompanyInsightRead:
    insight = await CompanyIntelligenceService(db, ai_provider).get_latest_insight(lead_id, current_user)
    if insight is None:
        raise NotFoundError(
            "No insight has been generated for this lead yet.", error_code="insight_not_found"
        )
    return CompanyInsightRead.model_validate(insight)


@router.get(
    "/{lead_id}/insights",
    response_model=list[CompanyInsightRead],
    summary="List all company-insight snapshots for a lead",
)
async def list_insights(
    lead_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser, ai_provider: AIProviderDep
) -> list[CompanyInsightRead]:
    insights = await CompanyIntelligenceService(db, ai_provider).list_insights(lead_id, current_user)
    return [CompanyInsightRead.model_validate(insight) for insight in insights]
