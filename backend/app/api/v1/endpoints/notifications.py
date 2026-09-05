"""
Notifications endpoints.

Provides full in-app notification management, unread counting, marking as read,
and notification preferences. Strictly enforces user and workspace isolation.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Query, status


from app.api.deps import CurrentActiveUser, DBSession, Pagination, WorkspaceContextDep
from app.schemas.notification import (
    NotificationListItem,
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    NotificationRead,
    PaginatedNotifications,
    UnreadCountResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("", response_model=PaginatedNotifications, summary="List notifications")
async def list_notifications(
    db: DBSession,
    current_user: CurrentActiveUser,
    pagination: Pagination,
    ws_ctx: WorkspaceContextDep,
    is_read: bool | None = None,
) -> PaginatedNotifications:
    """
    Returns paginated notifications for the authenticated user and active workspace.
    User A can NEVER see User B's notifications.
    """
    return await NotificationService(db).list_notifications(
        current_user=current_user,
        ws_ctx=ws_ctx,
        offset=pagination.offset,
        limit=pagination.page_size,
        is_read=is_read,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get unread notification count",
)
async def get_unread_count(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> UnreadCountResponse:
    """Returns the unread count badge number for the TopNavbar bell."""
    return await NotificationService(db).get_unread_count(
        current_user=current_user,
        ws_ctx=ws_ctx,
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationRead,
    summary="Mark a notification as read",
)
async def mark_as_read(
    notification_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> NotificationRead:
    """Marks a single notification as read, validating ownership."""
    notification = await NotificationService(db).mark_as_read(
        notification_id=notification_id,
        current_user=current_user,
    )
    return NotificationRead.model_validate(notification)


@router.post(
    "/mark-all-read",
    status_code=status.HTTP_200_OK,
    summary="Mark all notifications as read",
)
async def mark_all_read(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> dict[str, int]:
    """Marks all unread notifications as read for current user in current context."""
    count = await NotificationService(db).mark_all_read(
        current_user=current_user,
        ws_ctx=ws_ctx,
    )
    return {"marked_count": count}


@router.delete(
    "/clear-read",
    status_code=status.HTTP_200_OK,
    summary="Clear all read notifications",
)
async def clear_read_notifications(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> dict[str, int]:
    """Deletes all read notifications for current user in current workspace context."""
    count = await NotificationService(db).clear_read_notifications(
        current_user=current_user,
        ws_ctx=ws_ctx,
    )
    return {"cleared_count": count}


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a single notification",
)
async def delete_notification(
    notification_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> None:
    """Deletes a single notification by ID with user ownership check."""
    await NotificationService(db).delete_notification(
        notification_id=notification_id,
        current_user=current_user,
    )



@router.post(
    "/run-scheduler",
    status_code=status.HTTP_200_OK,
    summary="Trigger notification reminder scheduler tick on-demand",
)
async def trigger_scheduler_tick(
    db: DBSession,
    current_user: CurrentActiveUser,
) -> dict[str, Any]:
    """Manually triggers a reminder scheduler tick to evaluate overdue tasks, follow-ups, and meeting reminders."""
    from app.services.notification_scheduler_service import NotificationSchedulerService
    counts = await NotificationSchedulerService(db).run_tick()
    return {"status": "success", "counts": counts}



@router.get(
    "/preferences",
    response_model=NotificationPreferenceRead,
    summary="Get notification preferences",
)
async def get_preferences(
    db: DBSession,
    current_user: CurrentActiveUser,
) -> NotificationPreferenceRead:
    """Returns current user's notification preferences."""
    return await NotificationService(db).get_preferences(user_id=current_user.id)


@router.put(
    "/preferences",
    response_model=NotificationPreferenceRead,
    summary="Update notification preferences",
)
async def update_preferences(
    update_in: NotificationPreferenceUpdate,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> NotificationPreferenceRead:
    """Updates current user's notification preferences."""
    return await NotificationService(db).update_preferences(
        user_id=current_user.id,
        update_in=update_in,
    )


# ---------------------------------------------------------------------------
# Trigger / Simulator Endpoints (for Testing, Cron & AI integrations)
# ---------------------------------------------------------------------------


@router.post(
    "/triggers/test-digest",
    response_model=NotificationRead,
    summary="Trigger a weekly digest notification",
)
async def trigger_weekly_digest(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> NotificationRead:
    svc = NotificationService(db)
    notif = await svc.notify_weekly_digest(
        user_id=current_user.id,
        workspace_id=ws_ctx.workspace_id if not ws_ctx.is_personal else None,
        new_leads_count=12,
        open_opportunities_count=5,
        won_deals_count=3,
        pipeline_value=45000.0,
        insights_summary="3 opportunities have high conversion likelihood this week.",
    )
    await db.commit()
    return NotificationRead.model_validate(notif)


@router.post(
    "/triggers/test-ai-insight",
    response_model=NotificationRead,
    summary="Trigger an AI insight notification",
)
async def trigger_ai_insight(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    lead_name: str = "Acme Corp",
    insight_type: str = "High Deal Risk",
    recommended_action: str = "Schedule an urgent follow-up with the key decision maker.",
) -> NotificationRead:
    svc = NotificationService(db)
    notif = await svc.notify_ai_insight(
        user_id=current_user.id,
        workspace_id=ws_ctx.workspace_id if not ws_ctx.is_personal else None,
        lead_id=None,
        lead_name=lead_name,
        insight_type=insight_type,
        recommended_action=recommended_action,
    )
    await db.commit()
    return NotificationRead.model_validate(notif)
