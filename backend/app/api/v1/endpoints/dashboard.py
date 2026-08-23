"""
Dashboard & Sales Analytics endpoints (Module 8).
"""

import uuid

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentActiveUser, DBSession, WorkspaceContextDep
from app.schemas.dashboard import DashboardSummary, SnapshotHistoryItem
from app.services.sales_analytics_service import SalesAnalyticsService

router = APIRouter()


@router.get(
    "/summary",
    response_model=DashboardSummary,
    summary="Live pipeline breakdown, conversion rate, and pipeline value with workspace isolation",
)
async def get_dashboard_summary(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    owner_id: uuid.UUID | None = Query(
        default=None,
        description="Scope the dashboard to one rep's pipeline "
        "(workspace manager/admin only — ignored for regular team members, "
        "who always see their own authorized pipeline).",
    ),
) -> DashboardSummary:
    return await SalesAnalyticsService(db).get_dashboard_summary(
        current_user, ws_ctx=ws_ctx, owner_id=owner_id
    )


@router.post(
    "/snapshot",
    response_model=SnapshotHistoryItem,
    status_code=status.HTTP_201_CREATED,
    summary="Record a point-in-time snapshot of the current user's metrics",
)
async def record_snapshot(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> SnapshotHistoryItem:
    snapshot = await SalesAnalyticsService(db).record_snapshot(current_user, ws_ctx=ws_ctx)
    return SnapshotHistoryItem.model_validate(snapshot)


@router.get(
    "/snapshots",
    response_model=list[SnapshotHistoryItem],
    summary="Historical snapshots for the current user (for trend charts)",
)
async def get_snapshot_history(
    db: DBSession,
    current_user: CurrentActiveUser,
    limit: int = Query(default=30, ge=1, le=365),
) -> list[SnapshotHistoryItem]:
    snapshots = await SalesAnalyticsService(db).get_snapshot_history(current_user, limit=limit)
    return [SnapshotHistoryItem.model_validate(snapshot) for snapshot in snapshots]
