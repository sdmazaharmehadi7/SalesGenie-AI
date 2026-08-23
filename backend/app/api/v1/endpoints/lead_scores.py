"""
Lead Scoring & Recommendation Engine endpoints (Module 6).

Nested under a lead, same rationale as `company_insights.py`.
"""

import uuid

from fastapi import APIRouter, status

from app.api.deps import AIProviderDep, CurrentActiveUser, DBSession, WorkspaceContextDep
from app.core.exceptions import NotFoundError
from app.schemas.lead_score import LeadScoreRead
from app.services.lead_scoring_service import LeadScoringService

router = APIRouter()


@router.post(
    "/{lead_id}/scores/generate",
    response_model=LeadScoreRead,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new AI lead-score snapshot",
)
async def generate_score(
    lead_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> LeadScoreRead:
    score = await LeadScoringService(db, ai_provider).generate_score(lead_id, current_user, ws_ctx=ws_ctx)
    return LeadScoreRead.model_validate(score)


@router.get(
    "/{lead_id}/scores/latest",
    response_model=LeadScoreRead,
    summary="Get the most recent lead score",
)
async def get_latest_score(
    lead_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> LeadScoreRead:
    score = await LeadScoringService(db, ai_provider).get_latest_score(lead_id, current_user, ws_ctx=ws_ctx)
    if score is None:
        raise NotFoundError("No score has been generated for this lead yet.", error_code="score_not_found")
    return LeadScoreRead.model_validate(score)


@router.get(
    "/{lead_id}/scores",
    response_model=list[LeadScoreRead],
    summary="List all lead-score snapshots for a lead",
)
async def list_scores(
    lead_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> list[LeadScoreRead]:
    scores = await LeadScoringService(db, ai_provider).list_scores(lead_id, current_user, ws_ctx=ws_ctx)
    return [LeadScoreRead.model_validate(score) for score in scores]
