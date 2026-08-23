"""Team Tracking & Sales Performance Endpoints for Manager Role."""

import uuid
from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentActiveUser, DBSession, WorkspaceContextDep
from app.schemas.team_tracking import (
    FollowUpAlert,
    TeamActivityItem,
    TeamAiInsights,
    TeamChartsData,
    TeamMemberPerformance,
    TeamTrackingSummary,
)
from app.services.team_tracking_service import TeamTrackingService

router = APIRouter()


def _ensure_manager_access(ws_ctx: WorkspaceContextDep) -> None:
    """Strictly assert that request is inside a workspace where user is Manager/Admin."""
    if ws_ctx.is_personal or not ws_ctx.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team tracking is only accessible by workspace Managers.",
        )


@router.get(
    "/summary",
    response_model=TeamTrackingSummary,
    summary="Get overall team tracking summary metrics and trend comparisons",
)
async def get_team_summary(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    range: str = Query(default="month", description="Date range: today, week, month, all"),
) -> TeamTrackingSummary:
    _ensure_manager_access(ws_ctx)
    return await TeamTrackingService(db).get_team_summary(ws_ctx.workspace_id, date_range=range)


@router.get(
    "/members",
    response_model=list[TeamMemberPerformance],
    summary="Get performance metrics and activity breakdown for all team members",
)
async def get_team_members(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    range: str = Query(default="month", description="Date range: today, week, month, all"),
) -> list[TeamMemberPerformance]:
    _ensure_manager_access(ws_ctx)
    return await TeamTrackingService(db).get_team_members_performance(ws_ctx.workspace_id, date_range=range)


@router.get(
    "/members/{member_id}",
    response_model=TeamMemberPerformance,
    summary="Get detailed performance profile for a single team member",
)
async def get_single_member_performance(
    member_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    range: str = Query(default="month", description="Date range: today, week, month, all"),
) -> TeamMemberPerformance:
    _ensure_manager_access(ws_ctx)
    members = await TeamTrackingService(db).get_team_members_performance(ws_ctx.workspace_id, date_range=range)
    for m in members:
        if m.user_id == member_id:
            return m
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found in this workspace.")


@router.get(
    "/activities",
    response_model=list[TeamActivityItem],
    summary="Get recent sales activity timeline for team or filtered member",
)
async def get_team_activities(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    member_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
) -> list[TeamActivityItem]:
    _ensure_manager_access(ws_ctx)
    return await TeamTrackingService(db).get_team_activities(
        ws_ctx.workspace_id, member_id=member_id, limit=limit
    )


@router.get(
    "/follow-ups",
    response_model=list[FollowUpAlert],
    summary="Get follow-ups requiring manager attention across the team",
)
async def get_team_follow_ups(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> list[FollowUpAlert]:
    _ensure_manager_access(ws_ctx)
    return await TeamTrackingService(db).get_follow_ups_requiring_attention(ws_ctx.workspace_id)


@router.get(
    "/insights",
    response_model=TeamAiInsights,
    summary="Synthesize AI-powered team insights from workspace CRM data",
)
async def get_team_ai_insights(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> TeamAiInsights:
    _ensure_manager_access(ws_ctx)
    return await TeamTrackingService(db).get_team_insights(ws_ctx.workspace_id)


@router.get(
    "/charts",
    response_model=TeamChartsData,
    summary="Get data series for team performance charts",
)
async def get_team_charts_data(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    range: str = Query(default="month", description="Date range: today, week, month, all"),
) -> TeamChartsData:
    _ensure_manager_access(ws_ctx)
    return await TeamTrackingService(db).get_team_charts_data(ws_ctx.workspace_id, date_range=range)
