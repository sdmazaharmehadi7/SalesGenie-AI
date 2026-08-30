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
            type=NotificationType.LEAD_STATUS_CHANGED.value,
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
            type=NotificationType.LEAD_STATUS_CHANGED.value,
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
                "link": f"/leads/{lead_id}" if lead_id else "/crm/tasks",
            },
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
