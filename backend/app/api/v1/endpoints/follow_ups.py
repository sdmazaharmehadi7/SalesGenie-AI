"""Follow-up endpoints (CRM)."""

import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentActiveUser, DBSession, Pagination, WorkspaceContextDep
from app.schemas.follow_up import (
    FollowUpCreate,
    FollowUpRead,
    FollowUpReschedule,
    FollowUpSummary,
    FollowUpUpdate,
    PaginatedFollowUps,
)
from app.services.follow_up_service import FollowUpService

router = APIRouter()


@router.post(
    "",
    response_model=FollowUpRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a follow-up",
)
async def create_follow_up(
    follow_up_in: FollowUpCreate,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> FollowUpRead:
    return await FollowUpService(db).create_follow_up(
        follow_up_in,
        current_user,
        ws_ctx=ws_ctx,
    )


@router.get(
    "",
    response_model=PaginatedFollowUps,
    summary="List follow-ups (filterable by status, entity, assignee)",
)
async def list_follow_ups(
    db: DBSession,
    current_user: CurrentActiveUser,
    pagination: Pagination,
    ws_ctx: WorkspaceContextDep,
    status: str | None = None,
    lead_id: uuid.UUID | None = None,
    opportunity_id: uuid.UUID | None = None,
    assigned_to: uuid.UUID | None = None,
) -> PaginatedFollowUps:
    items, total = await FollowUpService(db).list_follow_ups(
        current_user,
        ws_ctx=ws_ctx,
        status_filter=status,
        lead_id=lead_id,
        opportunity_id=opportunity_id,
        assigned_to=assigned_to,
        offset=pagination.offset,
        limit=pagination.page_size,
    )
    return PaginatedFollowUps(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/summary",
    response_model=FollowUpSummary,
    summary="Get follow-ups counts summary",
)
async def get_follow_ups_summary(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> FollowUpSummary:
    return await FollowUpService(db).get_summary(current_user, ws_ctx=ws_ctx)


@router.get(
    "/{follow_up_id}",
    response_model=FollowUpRead,
    summary="Get follow-up details",
)
async def get_follow_up(
    follow_up_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> FollowUpRead:
    return await FollowUpService(db).get_follow_up(follow_up_id, current_user, ws_ctx=ws_ctx)


@router.patch(
    "/{follow_up_id}",
    response_model=FollowUpRead,
    summary="Update a follow-up",
)
async def update_follow_up(
    follow_up_id: uuid.UUID,
    follow_up_in: FollowUpUpdate,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> FollowUpRead:
    return await FollowUpService(db).update_follow_up(
        follow_up_id,
        follow_up_in,
        current_user,
        ws_ctx=ws_ctx,
    )


@router.patch(
    "/{follow_up_id}/reschedule",
    response_model=FollowUpRead,
    summary="Reschedule a follow-up",
)
async def reschedule_follow_up(
    follow_up_id: uuid.UUID,
    reschedule_in: FollowUpReschedule,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> FollowUpRead:
    return await FollowUpService(db).reschedule_follow_up(
        follow_up_id,
        reschedule_in,
        current_user,
        ws_ctx=ws_ctx,
    )


@router.patch(
    "/{follow_up_id}/complete",
    response_model=FollowUpRead,
    summary="Mark a follow-up as completed",
)
async def complete_follow_up(
    follow_up_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> FollowUpRead:
    return await FollowUpService(db).complete_follow_up(
        follow_up_id,
        current_user,
        ws_ctx=ws_ctx,
    )


@router.delete(
    "/{follow_up_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a follow-up",
)
async def delete_follow_up(
    follow_up_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> None:
    await FollowUpService(db).delete_follow_up(
        follow_up_id,
        current_user,
        ws_ctx=ws_ctx,
    )
