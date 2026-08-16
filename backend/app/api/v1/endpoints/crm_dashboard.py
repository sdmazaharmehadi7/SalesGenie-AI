"""CRM Dashboard & Predictive Analytics Endpoints."""

import uuid

from fastapi import APIRouter, Query

from app.api.deps import CurrentActiveUser, DBSession
from app.schemas.crm_dashboard import CRMDashboardSummary, PredictiveAnalytics
from app.services.crm_dashboard_service import CRMDashboardService

router = APIRouter()


@router.get("/summary", response_model=CRMDashboardSummary, summary="Get full CRM Dashboard KPI Overview")
async def get_crm_summary(
    db: DBSession,
    current_user: CurrentActiveUser,
    owner_id: uuid.UUID | None = Query(default=None, description="Filter summary by owner (unrestricted roles only)"),
) -> CRMDashboardSummary:
    return await CRMDashboardService(db).get_summary(current_user, owner_id=owner_id)


@router.get("/forecast", response_model=PredictiveAnalytics, summary="Get AI Predictive Sales Analytics & Forecast")
async def get_crm_forecast(
    db: DBSession,
    current_user: CurrentActiveUser,
    owner_id: uuid.UUID | None = Query(default=None, description="Filter forecast by owner"),
) -> PredictiveAnalytics:
    return await CRMDashboardService(db).get_predictive_analytics(current_user, owner_id=owner_id)
