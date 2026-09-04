"""CRM Dashboard & Predictive Analytics Endpoints."""

import uuid

from fastapi import APIRouter, Query

from app.api.deps import CurrentActiveUser, DBSession, WorkspaceContextDep
from app.schemas.crm_dashboard import (
    CRMDashboardSummary,
    LeadFollowUpRecommendation,
    PredictiveAnalytics,
)
from app.services.crm_dashboard_service import CRMDashboardService

router = APIRouter()


@router.get("/summary", response_model=CRMDashboardSummary, summary="Get full CRM Dashboard KPI Overview")
async def get_crm_summary(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    owner_id: uuid.UUID | None = Query(default=None, description="Filter summary by owner (unrestricted roles only)"),
) -> CRMDashboardSummary:
    return await CRMDashboardService(db).get_summary(current_user, ws_ctx=ws_ctx, owner_id=owner_id)


@router.get("/forecast", response_model=PredictiveAnalytics, summary="Get AI Predictive Sales Analytics & Forecast")
async def get_crm_forecast(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    owner_id: uuid.UUID | None = Query(default=None, description="Filter forecast by owner"),
) -> PredictiveAnalytics:
    return await CRMDashboardService(db).get_predictive_analytics(current_user, ws_ctx=ws_ctx, owner_id=owner_id)


@router.get(
    "/lead-recommendations",
    response_model=list[LeadFollowUpRecommendation],
    summary="Get automated lead follow-up & next step recommendations",
)
async def get_lead_recommendations(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    owner_id: uuid.UUID | None = Query(default=None, description="Filter recommendations by owner"),
    limit: int = Query(default=15, ge=1, le=50, description="Max recommendations to return"),
) -> list[LeadFollowUpRecommendation]:
    return await CRMDashboardService(db).get_lead_followup_recommendations(
        current_user,
        ws_ctx=ws_ctx,
        owner_id=owner_id,
        limit=limit,
    )

