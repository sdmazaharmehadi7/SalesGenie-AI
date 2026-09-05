"""
Notification service.

Handles notification creation, email delivery for lead assignments,
querying user/workspace isolated notifications, marking read status,
and managing notification preferences.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.core.config import settings
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.integrations.email.factory import get_email_provider
from app.models.notification import Notification, NotificationPreference, NotificationType
from app.models.user import User
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import (
    NotificationCreate,
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    PaginatedNotifications,
    UnreadCountResponse,
)

logger = get_logger(__name__)


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.notifications = NotificationRepository(db)

    def _resolve_context(
        self,
        ws_ctx: WorkspaceContext | None,
    ) -> tuple[bool, uuid.UUID | None]:
        if ws_ctx is not None:
            return (
                ws_ctx.is_personal,
                ws_ctx.workspace_id if not ws_ctx.is_personal else None,
            )
        return True, None

    # ------------------------------------------------------------------
    # Notification CRUD & Queries
    # ------------------------------------------------------------------

    async def list_notifications(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        *,
        offset: int = 0,
        limit: int = 20,
        is_read: bool | None = None,
    ) -> PaginatedNotifications:
        is_personal, workspace_id = self._resolve_context(ws_ctx)
        items, total = await self.notifications.list_notifications(
            user_id=current_user.id,
            workspace_id=workspace_id,
            is_personal=is_personal,
            is_read=is_read,
            offset=offset,
            limit=limit,
        )
        unread_count = await self.notifications.count_unread(
            user_id=current_user.id,
            workspace_id=workspace_id,
            is_personal=is_personal,
        )
        page = (offset // limit) + 1 if limit > 0 else 1
        return PaginatedNotifications(
            items=list(items),
            total=total,
            page=page,
            page_size=limit,
            unread_count=unread_count,
        )

    async def get_unread_count(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> UnreadCountResponse:
        is_personal, workspace_id = self._resolve_context(ws_ctx)
        count = await self.notifications.count_unread(
            user_id=current_user.id,
            workspace_id=workspace_id,
            is_personal=is_personal,
        )
        return UnreadCountResponse(unread_count=count)

    async def mark_as_read(
        self,
        notification_id: uuid.UUID,
        current_user: User,
    ) -> Notification:
        notif = await self.notifications.get_by_id(notification_id)
        if notif is None:
            raise NotFoundError("Notification not found.", error_code="notification_not_found")
        if notif.user_id != current_user.id:
            raise ForbiddenError(
                "You do not have permission to modify this notification.",
                error_code="notification_access_denied",
            )
        updated = await self.notifications.mark_as_read(notif)
        await self.db.commit()
        return updated

    async def mark_all_read(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> int:
        is_personal, workspace_id = self._resolve_context(ws_ctx)
        count = await self.notifications.mark_all_read(
            user_id=current_user.id,
            workspace_id=workspace_id,
            is_personal=is_personal,
        )
        await self.db.commit()
        return count

    async def delete_notification(
        self,
        notification_id: uuid.UUID,
        current_user: User,
    ) -> None:
        notif = await self.notifications.get_by_id(notification_id)
        if notif is None:
            raise NotFoundError("Notification not found.", error_code="notification_not_found")
        if notif.user_id != current_user.id:
            raise ForbiddenError(
                "You do not have permission to delete this notification.",
                error_code="notification_access_denied",
            )
        await self.notifications.delete(notif)
        await self.db.commit()

    async def clear_read_notifications(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> int:
        is_personal, workspace_id = self._resolve_context(ws_ctx)
        count = await self.notifications.clear_read_notifications(
            user_id=current_user.id,
            workspace_id=workspace_id,
            is_personal=is_personal,
        )
        await self.db.commit()
        return count


    # ------------------------------------------------------------------
    # Preferences
    # ------------------------------------------------------------------

    async def get_preferences(self, user_id: uuid.UUID) -> NotificationPreferenceRead:
        pref = await self.notifications.get_or_create_preferences(user_id)
        return NotificationPreferenceRead.model_validate(pref)

    async def update_preferences(
        self, user_id: uuid.UUID, update_in: NotificationPreferenceUpdate
    ) -> NotificationPreferenceRead:
        pref = await self.notifications.update_preferences(user_id, update_in)
        await self.db.commit()
        return NotificationPreferenceRead.model_validate(pref)

    # ------------------------------------------------------------------
    # Notification Dispatchers & Handlers
    # ------------------------------------------------------------------

    async def notify_lead_assigned(
        self,
        *,
        lead_id: uuid.UUID,
        lead_name: str,
        company_name: str,
        lead_status: str,
        manager_name: str,
        team_member: User,
        workspace_id: uuid.UUID | None,
        recent_activity: str | None = None,
        assignment_time: datetime | None = None,
    ) -> Notification | None:
        """
        Triggered when a Manager assigns a lead to a Team Member.
        Notifies ONLY the assigned Team Member via in-app notification
        and sends an email via the configured SalesGenie SMTP provider.
        """
        now = assignment_time or datetime.now(timezone.utc)
        time_str = now.strftime("%b %d, %Y at %I:%M %p UTC")
        formatted_activity = recent_activity or "Lead assigned by manager"
        lead_url = f"http://localhost:5173/leads/{lead_id}"

        pref = await self.notifications.get_or_create_preferences(team_member.id)
        notification = None

        # 1. In-App Notification
        if pref.lead_assigned_inapp:
            title = f"New Lead Assigned: {lead_name or company_name}"
            message = (
                f"{manager_name} assigned {lead_name or company_name} ({company_name}) to you. "
                f"Status: {lead_status}."
            )
            idempotency_key = f"lead_assign_{lead_id}_{team_member.id}_{int(now.timestamp())}"
            notif_in = NotificationCreate(
                user_id=team_member.id,
                workspace_id=workspace_id,
                type=NotificationType.LEAD_ASSIGNED.value,
                title=title,
                message=message,
                entity_type="lead",
                entity_id=lead_id,
                data={
                    "manager_name": manager_name,
                    "team_member_name": team_member.name,
                    "lead_name": lead_name,
                    "company_name": company_name,
                    "lead_status": lead_status,
                    "recent_activity": formatted_activity,
                    "assignment_time": time_str,
                    "link": f"/leads/{lead_id}",
                },
                idempotency_key=idempotency_key,
            )
            notification = await self.notifications.create(notif_in)

        # 2. Email Notification (strictly for lead assigned to me)
        if pref.lead_assigned_email and team_member.email:
            email_subject = f"New Lead Assigned to You — {lead_name or company_name}"
            email_body = f"""Hello {team_member.name},

{manager_name} assigned a new lead to you in SalesGenie AI.

Lead: {lead_name or company_name}
Company: {company_name}
Status: {lead_status}
Assignment Date: {time_str}

Recent Lead Activity:
{formatted_activity}

Open Lead → {lead_url}

Best regards,
SalesGenie AI Platform
"""
            try:
                email_provider = get_email_provider()
                await email_provider.send_email(
                    to_address=team_member.email,
                    subject=email_subject,
                    body=email_body,
                )
                logger.info(
                    "Lead assignment email sent to %s for lead %s",
                    team_member.email,
                    lead_id,
                )
            except Exception as exc:
                # Email failure must NOT fail the lead assignment operation
                logger.error(
                    "Failed to send lead assignment email to %s for lead %s: %s",
                    team_member.email,
                    lead_id,
                    exc,
                )

        return notification

    async def notify_lead_status_changed(
        self,
        *,
        lead_id: uuid.UUID,
        lead_name: str,
        company_name: str,
        old_status: str,
        new_status: str,
        changed_by_name: str,
        recipient_user_id: uuid.UUID,
        workspace_id: uuid.UUID | None,
        is_actor: bool = False,
    ) -> Notification | None:
        """Triggered when a lead changes status."""
        pref = await self.notifications.get_or_create_preferences(recipient_user_id)
        if not pref.lead_status_changed_inapp:
            return None

        title = f"Lead Status Updated: {lead_name or company_name}"
        if is_actor:
            message = (
                f"You updated {lead_name or company_name} status "
                f"from '{old_status}' to '{new_status}'."
            )
        else:
            message = (
                f"{changed_by_name} updated {lead_name or company_name} status "
                f"from '{old_status}' to '{new_status}'."
            )
        notif_in = NotificationCreate(
            user_id=recipient_user_id,
            workspace_id=workspace_id,
            type=NotificationType.LEAD_STATE_CHANGED.value,
            title=title,
            message=message,
            entity_type="lead",
            entity_id=lead_id,
            data={
                "lead_name": lead_name,
                "company_name": company_name,
                "old_status": old_status,
                "new_status": new_status,
                "changed_by": changed_by_name,
                "link": f"/leads/{lead_id}",
            },
            idempotency_key=f"lead_state_{lead_id}_{old_status}_{new_status}_{int(datetime.now(timezone.utc).timestamp())}",
        )
        return await self.notifications.create(notif_in)

    async def notify_opportunity_stage_changed(
        self,
        *,
        opp_id: uuid.UUID,
        opp_name: str,
        old_stage: str,
        new_stage: str,
        changed_by_name: str,
        recipient_user_id: uuid.UUID,
        workspace_id: uuid.UUID | None,
        is_actor: bool = False,
    ) -> Notification | None:
        """Triggered when a deal/opportunity changes pipeline stage."""
        pref = await self.notifications.get_or_create_preferences(recipient_user_id)
        if not pref.lead_status_changed_inapp:
            return None

        title = f"Pipeline Stage Updated: {opp_name}"
        if is_actor:
            message = f"You updated '{opp_name}' stage from '{old_stage}' to '{new_stage}'."
        else:
            message = f"{changed_by_name} moved deal '{opp_name}' from '{old_stage}' to '{new_stage}'."

        notif_in = NotificationCreate(
            user_id=recipient_user_id,
            workspace_id=workspace_id,
            type=NotificationType.DEAL_STATE_CHANGED.value,
            title=title,
            message=message,
            entity_type="opportunity",
            entity_id=opp_id,
            data={
                "opportunity_name": opp_name,
                "old_stage": old_stage,
                "new_stage": new_stage,
                "changed_by": changed_by_name,
                "link": f"/opportunities/{opp_id}",
            },
            idempotency_key=f"deal_state_{opp_id}_{old_stage}_{new_stage}_{int(datetime.now(timezone.utc).timestamp())}",
        )
        return await self.notifications.create(notif_in)

    async def notify_task_overdue(self, task: Any) -> Notification | None:
        """Triggered when an incomplete task passes its due time."""
        recipient_id = task.assigned_to or task.created_by
        if not recipient_id or not task.due_date:
            return None

        due_date_str = task.due_date.strftime("%b %d at %I:%M %p")
        idempotency_key = f"task_overdue_{task.id}_{task.due_date.isoformat()}"

        notif_in = NotificationCreate(
            user_id=recipient_id,
            workspace_id=task.workspace_id,
            type=NotificationType.TASK_OVERDUE.value,
            title=f"Task Overdue: {task.title}",
            message=f"Task '{task.title}' was due on {due_date_str} and is now overdue.",
            entity_type="task",
            entity_id=task.id,
            data={
                "task_title": task.title,
                "due_date": task.due_date.isoformat(),
                "priority": task.priority.value if hasattr(task.priority, "value") else str(task.priority),
                "link": "/tasks",
            },
            idempotency_key=idempotency_key,
        )
        return await self.notifications.create(notif_in)

    async def notify_task_rescheduled(
        self,
        task: Any,
        old_due: datetime | None,
        new_due: datetime,
        changed_by_name: str | None = None,
    ) -> Notification | None:
        """Triggered when a task or follow-up date/time is changed."""
        recipient_id = task.assigned_to or task.created_by
        if not recipient_id:
            return None

        new_due_str = new_due.strftime("%b %d, %Y at %I:%M %p")
        now_ts = int(datetime.now(timezone.utc).timestamp())
        idempotency_key = f"task_rescheduled_{task.id}_{new_due.isoformat()}_{now_ts}"

        actor_str = f" by {changed_by_name}" if changed_by_name else ""
        notif_in = NotificationCreate(
            user_id=recipient_id,
            workspace_id=task.workspace_id,
            type=NotificationType.TASK_RESCHEDULED.value,
            title=f"Task Rescheduled: {task.title}",
            message=f"Task '{task.title}' was rescheduled{actor_str} to {new_due_str}.",
            entity_type="task",
            entity_id=task.id,
            data={
                "task_title": task.title,
                "old_due": old_due.isoformat() if old_due else None,
                "new_due": new_due.isoformat(),
                "link": f"/leads/{task.lead_id}" if task.lead_id else "/tasks",
            },
            idempotency_key=idempotency_key,
        )
        return await self.notifications.create(notif_in)

    async def notify_followup_approaching(self, task: Any) -> Notification | None:
        """Triggered 15 minutes before a scheduled follow-up."""
        recipient_id = task.assigned_to or task.created_by
        if not recipient_id or not task.due_date:
            return None

        due_time_str = task.due_date.strftime("%I:%M %p")
        idempotency_key = f"followup_approaching_{task.id}_{task.due_date.isoformat()}"

        notif_in = NotificationCreate(
            user_id=recipient_id,
            workspace_id=task.workspace_id,
            type=NotificationType.FOLLOWUP_APPROACHING.value,
            title=f"Follow-up in 15 Minutes: {task.title}",
            message=f"Scheduled follow-up '{task.title}' is starting at {due_time_str} (in 15 minutes).",
            entity_type="follow_up",
            entity_id=task.id,
            data={
                "task_title": task.title,
                "due_date": task.due_date.isoformat(),
                "lead_id": str(task.lead_id) if task.lead_id else None,
                "link": f"/leads/{task.lead_id}" if task.lead_id else "/crm",
            },
            idempotency_key=idempotency_key,
        )
        return await self.notifications.create(notif_in)

    async def notify_followup_overdue(self, task: Any) -> Notification | None:
        """Triggered when an incomplete follow-up passes its scheduled time."""
        recipient_id = task.assigned_to or task.created_by
        if not recipient_id or not task.due_date:
            return None

        due_str = task.due_date.strftime("%b %d at %I:%M %p")
        idempotency_key = f"followup_overdue_{task.id}_{task.due_date.isoformat()}"

        notif_in = NotificationCreate(
            user_id=recipient_id,
            workspace_id=task.workspace_id,
            type=NotificationType.FOLLOWUP_OVERDUE.value,
            title=f"Follow-up Overdue: {task.title}",
            message=f"Scheduled follow-up '{task.title}' was due on {due_str} and is now overdue.",
            entity_type="follow_up",
            entity_id=task.id,
            data={
                "task_title": task.title,
                "due_date": task.due_date.isoformat(),
                "lead_id": str(task.lead_id) if task.lead_id else None,
                "link": f"/leads/{task.lead_id}" if task.lead_id else "/crm",
            },
            idempotency_key=idempotency_key,
        )
        return await self.notifications.create(notif_in)

    async def notify_meeting_scheduled(
        self,
        *,
        interaction_id: uuid.UUID,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID | None,
        meeting_title: str,
        meeting_time: datetime | None,
        lead_id: uuid.UUID | None = None,
        lead_name: str | None = None,
    ) -> Notification | None:
        """Triggered when a meeting is scheduled (along with activity log entry)."""
        time_str = meeting_time.strftime("%b %d at %I:%M %p") if meeting_time else "upcoming schedule"
        context_str = f" with {lead_name}" if lead_name else ""
        title = f"Meeting Scheduled: {meeting_title}"
        message = f"Meeting '{meeting_title}'{context_str} scheduled for {time_str}."
        idempotency_key = f"meeting_scheduled_{interaction_id}"

        notif_in = NotificationCreate(
            user_id=user_id,
            workspace_id=workspace_id,
            type=NotificationType.MEETING_SCHEDULED.value,
            title=title,
            message=message,
            entity_type="meeting",
            entity_id=interaction_id,
            data={
                "meeting_title": meeting_title,
                "meeting_time": meeting_time.isoformat() if meeting_time else None,
                "lead_id": str(lead_id) if lead_id else None,
                "lead_name": lead_name,
                "link": f"/leads/{lead_id}" if lead_id else "/crm",
            },
            idempotency_key=idempotency_key,
        )
        return await self.notifications.create(notif_in)


    async def notify_email_activity(
        self,
        *,
        recipient_user_id: uuid.UUID,
        workspace_id: uuid.UUID | None,
        activity_type: str,  # 'email_opened' or 'email_replied'
        lead_id: uuid.UUID | None = None,
        contact_name: str | None = None,
        company_name: str | None = None,
        subject: str | None = None,
    ) -> Notification | None:
        """Triggered when prospect opens or replies to an email."""
        pref = await self.notifications.get_or_create_preferences(recipient_user_id)
        if activity_type == NotificationType.EMAIL_OPENED.value and not pref.email_opened_inapp:
            return None
        if activity_type == NotificationType.EMAIL_REPLIED.value and not pref.email_replied_inapp:
            return None

        verb = "opened your email" if activity_type == NotificationType.EMAIL_OPENED.value else "replied to your email"
        target_name = contact_name or company_name or "A prospect"
        title = f"Email { 'Opened' if activity_type == NotificationType.EMAIL_OPENED.value else 'Replied' }: {target_name}"
        message = f"{target_name} ({company_name or 'Lead'}) {verb} regarding '{subject or 'Outreach'}."

        notif_in = NotificationCreate(
            user_id=recipient_user_id,
            workspace_id=workspace_id,
            type=activity_type,
            title=title,
            message=message,
            entity_type="lead" if lead_id else "contact",
            entity_id=lead_id,
            data={
                "contact_name": contact_name,
                "company_name": company_name,
                "subject": subject,
                "link": f"/leads/{lead_id}" if lead_id else "/crm/activities",
            },
        )
        return await self.notifications.create(notif_in)

    async def notify_meeting_reminder(
        self,
        *,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID | None,
        meeting_title: str,
        meeting_time: datetime,
        lead_id: uuid.UUID | None = None,
        entity_id: uuid.UUID | None = None,
    ) -> Notification | None:
        """Triggered 15 minutes before a scheduled meeting."""
        pref = await self.notifications.get_or_create_preferences(user_id)
        if not pref.meeting_reminder_inapp:
            return None

        time_str = meeting_time.strftime("%I:%M %p")
        title = f"Meeting in 15 Minutes: {meeting_title}"
        message = f"Your meeting '{meeting_title}' is scheduled for {time_str}."
        time_iso = meeting_time.isoformat()
        idempotency_key = f"meeting_reminder_{entity_id or lead_id}_{time_iso}"

        notif_in = NotificationCreate(
            user_id=user_id,
            workspace_id=workspace_id,
            type=NotificationType.MEETING_REMINDER.value,
            title=title,
            message=message,
            entity_type="meeting",
            entity_id=entity_id or lead_id,
            data={
                "meeting_title": meeting_title,
                "meeting_time": time_str,
                "link": f"/leads/{lead_id}" if lead_id else "/crm",
            },
            idempotency_key=idempotency_key,
        )
        return await self.notifications.create(notif_in)


    async def notify_weekly_digest(
        self,
        *,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID | None,
        new_leads_count: int,
        open_opportunities_count: int,
        won_deals_count: int,
        pipeline_value: float,
        insights_summary: str | None = None,
    ) -> Notification | None:
        """Weekly digest summary sent every Monday morning."""
        pref = await self.notifications.get_or_create_preferences(user_id)
        if not pref.weekly_digest_inapp:
            return None

        title = "Weekly Pipeline Digest"
        message = (
            f"Weekly overview: {new_leads_count} new leads, {open_opportunities_count} open opportunities, "
            f"{won_deals_count} won deals, and ${pipeline_value:,.2f} total pipeline value."
        )
        notif_in = NotificationCreate(
            user_id=user_id,
            workspace_id=workspace_id,
            type=NotificationType.WEEKLY_DIGEST.value,
            title=title,
            message=message,
            entity_type="digest",
            entity_id=None,
            data={
                "new_leads_count": new_leads_count,
                "open_opportunities_count": open_opportunities_count,
                "won_deals_count": won_deals_count,
                "pipeline_value": pipeline_value,
                "insights_summary": insights_summary,
                "link": "/dashboard",
            },
        )
        return await self.notifications.create(notif_in)

    async def notify_ai_insight(
        self,
        *,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID | None,
        lead_id: uuid.UUID | None,
        lead_name: str,
        insight_type: str,  # e.g., "High Deal Risk", "Upsell Opportunity"
        recommended_action: str,
    ) -> Notification | None:
        """Triggered when AI detects an important opportunity or risk."""
        pref = await self.notifications.get_or_create_preferences(user_id)
        if not pref.ai_insights_inapp:
            return None

        title = f"AI Insight: {insight_type} for {lead_name}"
        message = f"AI Analysis: {insight_type}. Recommended action: {recommended_action}"

        notif_in = NotificationCreate(
            user_id=user_id,
            workspace_id=workspace_id,
            type=NotificationType.AI_INSIGHTS.value,
            title=title,
            message=message,
            entity_type="lead" if lead_id else "ai_insight",
            entity_id=lead_id,
            data={
                "lead_name": lead_name,
                "insight_type": insight_type,
                "recommended_action": recommended_action,
                "link": f"/leads/{lead_id}" if lead_id else "/intelligence",
            },
        )
        return await self.notifications.create(notif_in)

    async def notify_team_mention(
        self,
        *,
        mentioned_user_id: uuid.UUID,
        author_name: str,
        note_snippet: str,
        lead_id: uuid.UUID | None,
        lead_name: str | None,
        workspace_id: uuid.UUID | None,
    ) -> Notification | None:
        """Triggered when a teammate @mentions a user in a CRM note."""
        pref = await self.notifications.get_or_create_preferences(mentioned_user_id)
        if not pref.team_mentions_inapp:
            return None

        context_lead = f" on {lead_name}" if lead_name else ""
        title = f"{author_name} mentioned you in a note{context_lead}"
        message = f'"{note_snippet}"'

        notif_in = NotificationCreate(
            user_id=mentioned_user_id,
            workspace_id=workspace_id,
            type=NotificationType.TEAM_MENTIONS.value,
            title=title,
            message=message,
            entity_type="lead" if lead_id else "activity",
            entity_id=lead_id,
            data={
                "author_name": author_name,
                "note_snippet": note_snippet,
                "lead_name": lead_name,
                "link": f"/leads/{lead_id}" if lead_id else "/crm/activities",
            },
        )
        return await self.notifications.create(notif_in)

    async def notify_workspace_invitation(
        self,
        *,
        invitation_id: uuid.UUID,
        workspace_id: uuid.UUID,
        workspace_name: str,
        manager_name: str,
        invited_user: User,
        token: str,
    ) -> Notification | None:
        """
        Triggered when a Manager invites a user to join a workspace.
        Creates an in-app notification for ONLY the invited user
        and sends an email via the configured SalesGenie SMTP/email provider.
        """
        title = "New Workspace Invitation"
        message = f"{manager_name} invited you to join {workspace_name}."
        idempotency_key = f"ws_invite:{workspace_id}:{invited_user.id}"

        # 1. In-App Notification (user-level, workspace_id=None so user sees it anywhere)
        notif_in = NotificationCreate(
            user_id=invited_user.id,
            workspace_id=None,
            type=NotificationType.WORKSPACE_INVITATION.value,
            title=title,
            message=message,
            entity_type="workspace_invitation",
            entity_id=invitation_id,
            data={
                "workspace_id": str(workspace_id),
                "workspace_name": workspace_name,
                "manager_name": manager_name,
                "token": token,
                "link": "/workspace-hub",
            },
            idempotency_key=idempotency_key,
        )
        notification = await self.notifications.create(notif_in)

        # 2. Email Notification
        if invited_user.email:
            email_subject = f"You're invited to join {workspace_name} on SalesGenie"
            hub_url = "http://localhost:5173/workspace-hub"
            user_name_display = invited_user.name or invited_user.email.split("@")[0]
            email_body = f"""Hi {user_name_display},

{manager_name} has invited you to join the "{workspace_name}" workspace on SalesGenie.

Open SalesGenie to review and accept the invitation.

View Invitation: {hub_url}

Best regards,
SalesGenie AI Team
"""
            try:
                email_provider = get_email_provider()
                await email_provider.send_email(
                    to_address=invited_user.email,
                    subject=email_subject,
                    body=email_body,
                )
                logger.info(
                    "Workspace invitation email sent to %s for workspace %s",
                    invited_user.email,
                    workspace_name,
                )
            except Exception as exc:
                logger.warning(
                    "Failed to send workspace invitation email to %s: %s",
                    invited_user.email,
                    exc,
                )

        return notification

    async def resolve_invitation_notifications(
        self,
        *,
        user_id: uuid.UUID,
        invitation_id: uuid.UUID,
    ) -> int:
        """Marks pending workspace invitation notifications as read for this user & invitation."""
        return await self.notifications.mark_entity_notifications_read(
            user_id=user_id,
            entity_type="workspace_invitation",
            entity_id=invitation_id,
        )
