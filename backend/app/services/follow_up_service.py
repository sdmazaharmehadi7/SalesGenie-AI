"""Follow-up service — business logic for CRM Follow-up Management with strict workspace isolation."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import WorkspaceContext
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.pipeline_enums import InteractionType, TaskPriority
from app.models.task import Task, compute_follow_up_status
from app.models.user import User, UserRole
from app.models.workspace import MembershipStatus, WorkspaceRole
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.follow_up import (
    FollowUpCreate,
    FollowUpRead,
    FollowUpReschedule,
    FollowUpSummary,
    FollowUpUpdate,
)
from app.schemas.sales_interaction import SalesInteractionCreate
from app.services.account_service import AccountService
from app.services.activity_service import ActivityService
from app.services.contact_service import ContactService
from app.services.lead_service import LeadService
from app.services.opportunity_service import OpportunityService

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class FollowUpService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.workspaces = WorkspaceRepository(db)

    def _resolve_context(
        self,
        ws_ctx: WorkspaceContext | None,
        current_user: User,
    ) -> tuple[bool, bool, uuid.UUID | None]:
        """Returns (is_personal, is_manager, workspace_id)."""
        if ws_ctx is not None:
            return (
                ws_ctx.is_personal,
                ws_ctx.is_manager or current_user.role in UNRESTRICTED_ROLES,
                ws_ctx.workspace_id if not ws_ctx.is_personal else None,
            )
        return True, current_user.role in UNRESTRICTED_ROLES, None

    def _is_owner_or_assignee(self, task: Task, user_id: uuid.UUID) -> bool:
        return task.assigned_to == user_id or task.created_by == user_id

    def _task_to_read(self, task: Task) -> FollowUpRead:
        """Converts Task model to FollowUpRead with entity names populated."""
        entity_name = None
        if task.lead:
            entity_name = task.lead.company_name or task.lead.contact_name
        elif task.opportunity:
            entity_name = task.opportunity.name

        assignee_name = task.assignee.name if task.assignee else None

        return FollowUpRead(
            id=task.id,
            title=task.title,
            description=task.description,
            due_date=task.due_date,
            is_completed=task.is_completed,
            completed_at=task.completed_at,
            rescheduled_at=task.rescheduled_at,
            priority=task.priority,
            assigned_to=task.assigned_to,
            created_by=task.created_by,
            lead_id=task.lead_id,
            contact_id=task.contact_id,
            account_id=task.account_id,
            opportunity_id=task.opportunity_id,
            workspace_id=task.workspace_id,
            created_at=task.created_at,
            updated_at=task.updated_at,
            entity_name=entity_name,
            assignee_name=assignee_name,
        )

    async def _verify_crm_record(
        self,
        follow_up_in: FollowUpCreate | FollowUpUpdate,
        current_user: User,
        ws_ctx: WorkspaceContext | None,
    ) -> None:
        """Verifies the target CRM record exists and is accessible within current context."""
        if getattr(follow_up_in, "lead_id", None):
            await LeadService(self.db).get_lead(follow_up_in.lead_id, current_user, ws_ctx=ws_ctx)
        if getattr(follow_up_in, "opportunity_id", None):
            await OpportunityService(self.db).get_opportunity(follow_up_in.opportunity_id, current_user, ws_ctx=ws_ctx)
        if getattr(follow_up_in, "contact_id", None):
            await ContactService(self.db).get_contact(follow_up_in.contact_id, current_user)
        if getattr(follow_up_in, "account_id", None):
            await AccountService(self.db).get_account(follow_up_in.account_id, current_user)

    async def create_follow_up(
        self,
        follow_up_in: FollowUpCreate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> FollowUpRead:
        if not follow_up_in.due_date:
            raise BadRequestError("A valid follow-up date and time is required.", error_code="invalid_date")

        # Verify CRM record exists and caller is authorized to access it
        await self._verify_crm_record(follow_up_in, current_user, ws_ctx)

        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        # Determine assignment: managers can assign to members, otherwise current user
        if is_personal:
            assigned_to = current_user.id
            target_workspace_id = None
        else:
            target_workspace_id = workspace_id
            if is_manager and follow_up_in.assigned_to:
                # Verify membership of assigned user
                membership = await self.workspaces.get_membership(workspace_id, follow_up_in.assigned_to)
                if not membership or membership.status != MembershipStatus.ACTIVE.value:
                    raise BadRequestError("Assigned user is not an active member of this workspace.", error_code="invalid_assignee")
                assigned_to = follow_up_in.assigned_to
            else:
                assigned_to = current_user.id

        task = Task(
            title=follow_up_in.title or "Follow-up",
            description=follow_up_in.notes,
            due_date=follow_up_in.due_date,
            priority=follow_up_in.priority,
            task_type="follow_up",
            is_completed=False,
            assigned_to=assigned_to,
            created_by=current_user.id,
            lead_id=follow_up_in.lead_id,
            opportunity_id=follow_up_in.opportunity_id,
            contact_id=follow_up_in.contact_id,
            account_id=follow_up_in.account_id,
            workspace_id=target_workspace_id,
        )
        self.db.add(task)
        await self.db.flush()
        await self.db.commit()

        # Reload with relationships
        return await self.get_follow_up(task.id, current_user, ws_ctx)

    async def get_follow_up(
        self,
        follow_up_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> FollowUpRead:
        stmt = (
            select(Task)
            .options(
                selectinload(Task.lead),
                selectinload(Task.opportunity),
                selectinload(Task.assignee),
            )
            .where(Task.id == follow_up_id, Task.task_type == "follow_up")
        )
        result = await self.db.execute(stmt)
        task = result.scalar_one_or_none()
        if task is None:
            raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")

        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        # Workspace isolation enforcement
        if is_personal:
            if task.workspace_id is not None:
                raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")
            if current_user.role not in UNRESTRICTED_ROLES and not self._is_owner_or_assignee(task, current_user.id):
                raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")
        else:
            if task.workspace_id != workspace_id:
                raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")
            if not is_manager and not self._is_owner_or_assignee(task, current_user.id):
                raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")

        return self._task_to_read(task)

    async def update_follow_up(
        self,
        follow_up_id: uuid.UUID,
        follow_up_in: FollowUpUpdate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> FollowUpRead:
        task = await self._get_task_model(follow_up_id, current_user, ws_ctx)

        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if follow_up_in.title is not None:
            task.title = follow_up_in.title
        if follow_up_in.notes is not None:
            task.description = follow_up_in.notes
        if follow_up_in.priority is not None:
            task.priority = follow_up_in.priority
        if follow_up_in.due_date is not None:
            task.due_date = follow_up_in.due_date

        if follow_up_in.assigned_to is not None:
            if not is_manager and not is_personal and follow_up_in.assigned_to != current_user.id:
                raise ForbiddenError("Only managers can reassign follow-ups.", error_code="reassign_forbidden")
            if not is_personal and workspace_id:
                membership = await self.workspaces.get_membership(workspace_id, follow_up_in.assigned_to)
                if not membership or membership.status != MembershipStatus.ACTIVE.value:
                    raise BadRequestError("Assigned user is not an active member of this workspace.", error_code="invalid_assignee")
            task.assigned_to = follow_up_in.assigned_to

        await self.db.flush()
        await self.db.commit()

        return await self.get_follow_up(follow_up_id, current_user, ws_ctx)

    async def reschedule_follow_up(
        self,
        follow_up_id: uuid.UUID,
        reschedule_in: FollowUpReschedule,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> FollowUpRead:
        if not reschedule_in.due_date:
            raise BadRequestError("A valid new follow-up date and time is required.", error_code="invalid_date")

        task = await self._get_task_model(follow_up_id, current_user, ws_ctx)

        old_due = task.due_date
        task.due_date = reschedule_in.due_date
        task.rescheduled_at = datetime.now(timezone.utc)
        if reschedule_in.notes:
            existing = task.description or ""
            task.description = f"{existing}\n[Rescheduled]: {reschedule_in.notes}".strip()

        from app.services.notification_service import NotificationService
        await NotificationService(self.db).notify_task_rescheduled(
            task=task,
            old_due=old_due,
            new_due=reschedule_in.due_date,
            changed_by_name=current_user.name,
        )

        await self.db.flush()
        await self.db.commit()

        return await self.get_follow_up(follow_up_id, current_user, ws_ctx)


    async def complete_follow_up(
        self,
        follow_up_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> FollowUpRead:
        task = await self._get_task_model(follow_up_id, current_user, ws_ctx)

        task.is_completed = True
        task.completed_at = datetime.now(timezone.utc)

        # CRM Activity Integration: log a touchpoint in sales_interactions timeline
        # so it is reflected in the entity's CRM activity history
        activity_summary = f"Completed follow-up: {task.title}"
        if task.description:
            activity_summary += f" — {task.description}"

        activity_in = SalesInteractionCreate(
            interaction_type=InteractionType.FOLLOW_UP,
            summary=activity_summary,
            lead_id=task.lead_id,
            opportunity_id=task.opportunity_id,
            contact_id=task.contact_id,
            account_id=task.account_id,
            workspace_id=task.workspace_id,
        )
        await ActivityService(self.db).log_activity(activity_in, current_user, ws_ctx=ws_ctx)

        await self.db.flush()
        await self.db.commit()

        return await self.get_follow_up(follow_up_id, current_user, ws_ctx)

    async def delete_follow_up(
        self,
        follow_up_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> None:
        task = await self._get_task_model(follow_up_id, current_user, ws_ctx)
        await self.db.delete(task)
        await self.db.commit()

    async def list_follow_ups(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        *,
        status_filter: str | None = None,
        lead_id: uuid.UUID | None = None,
        opportunity_id: uuid.UUID | None = None,
        assigned_to: uuid.UUID | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[FollowUpRead], int]:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        filters: list[ColumnElement[bool]] = [Task.task_type == "follow_up"]

        if is_personal:
            filters.append(Task.workspace_id.is_(None))
            if current_user.role not in UNRESTRICTED_ROLES:
                filters.append(or_(Task.assigned_to == current_user.id, Task.created_by == current_user.id))
        else:
            filters.append(Task.workspace_id == workspace_id)
            if not is_manager:
                filters.append(or_(Task.assigned_to == current_user.id, Task.created_by == current_user.id))
            elif assigned_to:
                filters.append(Task.assigned_to == assigned_to)

        if lead_id:
            filters.append(Task.lead_id == lead_id)
        if opportunity_id:
            filters.append(Task.opportunity_id == opportunity_id)

        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=999999)

        if status_filter:
            sf = status_filter.lower()
            if sf == "completed":
                filters.append(Task.is_completed == True)  # noqa: E712
            elif sf == "active":
                filters.append(Task.is_completed == False)  # noqa: E712
            elif sf == "upcoming":
                filters.append(Task.is_completed == False)  # noqa: E712
                filters.append(Task.due_date > now)
            elif sf == "due":
                filters.append(Task.is_completed == False)  # noqa: E712
                filters.append(Task.due_date >= start_of_today)
                filters.append(Task.due_date <= end_of_today)
            elif sf == "overdue":
                filters.append(Task.is_completed == False)  # noqa: E712
                filters.append(Task.due_date < now)
            elif sf == "rescheduled":
                filters.append(Task.is_completed == False)  # noqa: E712
                filters.append(Task.rescheduled_at.is_not(None))

        count_query = select(func.count()).select_from(Task).where(*filters)
        total = (await self.db.execute(count_query)).scalar_one()

        query = (
            select(Task)
            .options(
                selectinload(Task.lead),
                selectinload(Task.opportunity),
                selectinload(Task.assignee),
            )
            .where(*filters)
            .order_by(
                Task.is_completed.asc(),
                Task.due_date.asc().nulls_last(),
                Task.updated_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(query)
        tasks = list(result.scalars().all())

        return [self._task_to_read(t) for t in tasks], total

    async def get_summary(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> FollowUpSummary:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        filters: list[ColumnElement[bool]] = [Task.task_type == "follow_up"]
        if is_personal:
            filters.append(Task.workspace_id.is_(None))
            if current_user.role not in UNRESTRICTED_ROLES:
                filters.append(or_(Task.assigned_to == current_user.id, Task.created_by == current_user.id))
        else:
            filters.append(Task.workspace_id == workspace_id)
            if not is_manager:
                filters.append(or_(Task.assigned_to == current_user.id, Task.created_by == current_user.id))

        query = select(Task.due_date, Task.is_completed, Task.rescheduled_at).where(*filters)
        result = await self.db.execute(query)
        rows = result.all()

        now = datetime.now(timezone.utc)
        upcoming = 0
        due = 0
        overdue = 0
        completed = 0

        for due_date, is_completed, rescheduled_at in rows:
            status = compute_follow_up_status(due_date, is_completed, rescheduled_at, now=now)
            if status == "COMPLETED":
                completed += 1
            elif status == "OVERDUE":
                overdue += 1
            elif status == "DUE":
                due += 1
            else:
                upcoming += 1

        total_active = overdue + due + upcoming

        return FollowUpSummary(
            upcoming=upcoming,
            due=due,
            overdue=overdue,
            completed=completed,
            total_active=total_active,
        )

    async def _get_task_model(
        self,
        follow_up_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None,
    ) -> Task:
        """Internal helper to get task model with access validation."""
        task = await self.db.get(Task, follow_up_id)
        if task is None or task.task_type != "follow_up":
            raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")

        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            if task.workspace_id is not None:
                raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")
            if current_user.role not in UNRESTRICTED_ROLES and not self._is_owner_or_assignee(task, current_user.id):
                raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")
        else:
            if task.workspace_id != workspace_id:
                raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")
            if not is_manager and not self._is_owner_or_assignee(task, current_user.id):
                raise NotFoundError("Follow-up not found.", error_code="follow_up_not_found")

        return task
