"""
Notification Scheduler Service.

Runs periodic reminder checks (approximately every minute) to dispatch:
1. TASK_OVERDUE: Incomplete tasks past their due time
2. FOLLOWUP_APPROACHING: Incomplete follow-ups 15 minutes before scheduled due date
3. FOLLOWUP_OVERDUE: Incomplete follow-ups past their scheduled time
4. MEETING_REMINDER: Meetings scheduled 15 minutes away

Uses database unique idempotency keys to strictly prevent duplicate notifications
when the scheduler runs repeatedly.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.models.email_integration import EmailIntegration, IntegrationStatus
from app.models.pipeline_enums import InteractionType
from app.models.sales_interaction import SalesInteraction
from app.models.task import Task
from app.models.user import User
from app.services.gmail_integration_service import GmailIntegrationService
from app.services.notification_service import NotificationService

logger = get_logger(__name__)


class NotificationSchedulerService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.notif_service = NotificationService(db)

    async def run_tick(self) -> dict[str, int]:
        """
        Executes a single check cycle for all time-based reminders and overdue alerts.
        Returns a dictionary of counts for each processed type.
        """
        now = datetime.now(timezone.utc)
        approaching_window = now + timedelta(minutes=15)
        stats = {
            "task_overdue": 0,
            "followup_approaching": 0,
            "followup_overdue": 0,
            "meeting_reminder": 0,
        }

        # --------------------------------------------------------------
        # 1. TASK_OVERDUE: Incomplete tasks where due_date < now
        # --------------------------------------------------------------
        task_stmt = select(Task).where(
            Task.is_completed.is_(False),
            Task.task_type == "task",
            Task.due_date.is_not(None),
            Task.due_date < now,
        )
        tasks_res = await self.db.execute(task_stmt)
        overdue_tasks = tasks_res.scalars().all()

        for task in overdue_tasks:
            try:
                notif = await self.notif_service.notify_task_overdue(task)
                if notif:
                    stats["task_overdue"] += 1
            except Exception as e:
                logger.error("Error generating TASK_OVERDUE for task %s: %s", task.id, e)

        # --------------------------------------------------------------
        # 2. FOLLOWUP_APPROACHING: Incomplete follow-ups 15m away
        # --------------------------------------------------------------
        fu_app_stmt = select(Task).where(
            Task.is_completed.is_(False),
            Task.task_type == "follow_up",
            Task.due_date.is_not(None),
            Task.due_date >= now,
            Task.due_date <= approaching_window,
        )
        fu_app_res = await self.db.execute(fu_app_stmt)
        approaching_fus = fu_app_res.scalars().all()

        for fu in approaching_fus:
            try:
                notif = await self.notif_service.notify_followup_approaching(fu)
                if notif:
                    stats["followup_approaching"] += 1
            except Exception as e:
                logger.error("Error generating FOLLOWUP_APPROACHING for follow-up %s: %s", fu.id, e)

        # --------------------------------------------------------------
        # 3. FOLLOWUP_OVERDUE: Incomplete follow-ups where due_date < now
        # --------------------------------------------------------------
        fu_over_stmt = select(Task).where(
            Task.is_completed.is_(False),
            Task.task_type == "follow_up",
            Task.due_date.is_not(None),
            Task.due_date < now,
        )
        fu_over_res = await self.db.execute(fu_over_stmt)
        overdue_fus = fu_over_res.scalars().all()

        for fu in overdue_fus:
            try:
                notif = await self.notif_service.notify_followup_overdue(fu)
                if notif:
                    stats["followup_overdue"] += 1
            except Exception as e:
                logger.error("Error generating FOLLOWUP_OVERDUE for follow-up %s: %s", fu.id, e)

        # --------------------------------------------------------------
        # 4. MEETING_REMINDER: Meetings starting in [now, now + 15m]
        # Check both SalesInteractions and tasks with task_type='meeting'
        # --------------------------------------------------------------
        meet_stmt = select(SalesInteraction).where(
            SalesInteraction.interaction_type == InteractionType.MEETING,
            SalesInteraction.interaction_date >= now,
            SalesInteraction.interaction_date <= approaching_window,
        )
        meet_res = await self.db.execute(meet_stmt)
        approaching_meetings = meet_res.scalars().all()

        for m in approaching_meetings:
            if m.user_id:
                try:
                    notif = await self.notif_service.notify_meeting_reminder(
                        user_id=m.user_id,
                        workspace_id=m.workspace_id,
                        meeting_title=m.summary or "Upcoming Meeting",
                        meeting_time=m.interaction_date,
                        lead_id=m.lead_id,
                        entity_id=m.id,
                    )
                    if notif:
                        stats["meeting_reminder"] += 1
                except Exception as e:
                    logger.error("Error generating MEETING_REMINDER for meeting %s: %s", m.id, e)

        # Also check Task models of type 'meeting'
        meet_task_stmt = select(Task).where(
            Task.is_completed.is_(False),
            Task.task_type == "meeting",
            Task.due_date.is_not(None),
            Task.due_date >= now,
            Task.due_date <= approaching_window,
        )
        meet_task_res = await self.db.execute(meet_task_stmt)
        for mt in meet_task_res.scalars().all():
            recipient = mt.assigned_to or mt.created_by
            if recipient and mt.due_date:
                try:
                    notif = await self.notif_service.notify_meeting_reminder(
                        user_id=recipient,
                        workspace_id=mt.workspace_id,
                        meeting_title=mt.title,
                        meeting_time=mt.due_date,
                        lead_id=mt.lead_id,
                        entity_id=mt.id,
                    )
                    if notif:
                        stats["meeting_reminder"] += 1
                except Exception as e:
                    logger.error("Error generating MEETING_REMINDER for task meeting %s: %s", mt.id, e)


        # --------------------------------------------------------------
        # 5. PERIODIC GMAIL SYNC: Auto-sync active Gmail accounts every 5 minutes
        # --------------------------------------------------------------
        try:
            sync_threshold = now - timedelta(minutes=5)
            active_integrations_stmt = select(EmailIntegration).where(
                EmailIntegration.status == IntegrationStatus.CONNECTED,
                or_(
                    EmailIntegration.last_synced_at.is_(None),
                    EmailIntegration.last_synced_at <= sync_threshold,
                ),
            ).limit(5)
            active_res = await self.db.execute(active_integrations_stmt)
            integrations_to_sync = active_res.scalars().all()

            for integ in integrations_to_sync:
                user_res = await self.db.execute(select(User).where(User.id == integ.user_id))
                user = user_res.scalar_one_or_none()
                if user:
                    try:
                        gmail_svc = GmailIntegrationService(self.db)
                        await gmail_svc.sync_relevant_emails(user)
                    except Exception as g_err:
                        logger.warning("Background Gmail sync for user %s failed: %s", user.id, g_err)
        except Exception as sync_loop_err:
            logger.warning("Background Gmail sync check encountered error: %s", sync_loop_err)

        await self.db.commit()
        return stats


async def run_notification_scheduler_loop(interval_seconds: int = 60) -> None:
    """
    Background worker loop that runs continuously during application lifecycle.
    Sleeps interval_seconds between ticks and cleanly catches cancellation.
    """
    logger.info("Notification scheduler background loop started (interval=%ds).", interval_seconds)
    while True:
        try:
            async with AsyncSessionLocal() as session:
                service = NotificationSchedulerService(session)
                counts = await service.run_tick()
                total_fired = sum(counts.values())
                if total_fired > 0:
                    logger.info("Notification scheduler tick processed: %s", counts)
        except asyncio.CancelledError:
            logger.info("Notification scheduler loop cancelled.")
            break
        except Exception as exc:
            logger.error("Error in notification scheduler loop: %s", exc, exc_info=True)

        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            break
