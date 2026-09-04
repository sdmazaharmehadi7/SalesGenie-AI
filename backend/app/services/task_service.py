"""Task service — business logic for CRM Tasks with workspace isolation."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.pipeline_enums import TaskPriority
from app.models.task import Task
from app.models.user import User, UserRole
from app.models.workspace import MembershipStatus, WorkspaceRole
from app.repositories.task_repository import TaskRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.task import TaskCreate, TaskUpdate

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class TaskService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.tasks = TaskRepository(db)
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

    def _is_task_owner_or_assignee(self, task: Task, user_id: uuid.UUID) -> bool:
        return task.assigned_to == user_id or task.created_by == user_id

    async def create_task(
        self,
        task_in: TaskCreate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Task:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            task = await self.tasks.create(task_in, created_by=current_user.id, workspace_id=None)
        else:
            assigned_to = task_in.assigned_to if (is_manager and task_in.assigned_to) else current_user.id
            task_data = task_in.model_copy(update={"assigned_to": assigned_to})
            task = await self.tasks.create(task_data, created_by=current_user.id, workspace_id=workspace_id)

        await self.db.commit()
        return task

    async def get_task(
        self,
        task_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Task:
        task = await self.tasks.get_by_id(task_id)
        if task is None:
            raise NotFoundError("Task not found.", error_code="task_not_found")

        if ws_ctx is not None:
            is_personal = ws_ctx.is_personal
            is_manager = ws_ctx.is_manager or current_user.role in UNRESTRICTED_ROLES

            if is_personal:
                if task.workspace_id is not None:
                    raise NotFoundError("Task not found.", error_code="task_not_found")
                if current_user.role not in UNRESTRICTED_ROLES and not self._is_task_owner_or_assignee(task, current_user.id):
                    raise NotFoundError("Task not found.", error_code="task_not_found")
            else:
                if task.workspace_id != ws_ctx.workspace_id:
                    raise NotFoundError("Task not found.", error_code="task_not_found")
                if not is_manager and not self._is_task_owner_or_assignee(task, current_user.id):
                    raise NotFoundError("Task not found.", error_code="task_not_found")
        else:
            # Fallback for internal callers without explicit ws_ctx
            if task.workspace_id is None:
                if current_user.role not in UNRESTRICTED_ROLES and not self._is_task_owner_or_assignee(task, current_user.id):
                    raise NotFoundError("Task not found.", error_code="task_not_found")
            else:
                if current_user.role not in UNRESTRICTED_ROLES:
                    membership = await self.workspaces.get_membership(task.workspace_id, current_user.id)
                    if membership is None or membership.status != MembershipStatus.ACTIVE.value:
                        raise NotFoundError("Task not found.", error_code="task_not_found")
                    if membership.role != WorkspaceRole.MANAGER and not self._is_task_owner_or_assignee(task, current_user.id):
                        raise NotFoundError("Task not found.", error_code="task_not_found")

        return task

    async def update_task(
        self,
        task_id: uuid.UUID,
        task_in: TaskUpdate,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Task:
        task = await self.get_task(task_id, current_user, ws_ctx=ws_ctx)
        old_due = task.due_date
        updated = await self.tasks.update(task, task_in)

        if task_in.due_date is not None and task_in.due_date != old_due:
            from app.services.notification_service import NotificationService
            await NotificationService(self.db).notify_task_rescheduled(
                task=updated,
                old_due=old_due,
                new_due=task_in.due_date,
                changed_by_name=current_user.name,
            )

        await self.db.commit()
        return updated


    async def toggle_complete(
        self,
        task_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> Task:
        task = await self.get_task(task_id, current_user, ws_ctx=ws_ctx)
        updated = await self.tasks.toggle_complete(task)
        await self.db.commit()
        return updated

    async def delete_task(
        self,
        task_id: uuid.UUID,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> None:
        task = await self.get_task(task_id, current_user, ws_ctx=ws_ctx)

        is_personal, is_manager, _ = self._resolve_context(ws_ctx, current_user)
        if not is_personal and not is_manager and not self._is_task_owner_or_assignee(task, current_user.id):
            raise ForbiddenError(
                "You do not have permission to delete this task.",
                error_code="delete_forbidden",
            )

        await self.tasks.delete(task)
        await self.db.commit()

    async def list_tasks(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        *,
        offset: int = 0,
        limit: int = 50,
        is_completed: bool | None = None,
        priority: TaskPriority | None = None,
        lead_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        opportunity_id: uuid.UUID | None = None,
        search: str | None = None,
        assigned_to: uuid.UUID | None = None,
    ) -> tuple[list[Task], int]:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            user_id_filter = current_user.id if current_user.role not in UNRESTRICTED_ROLES else None
            assigned_to_filter = assigned_to if (current_user.role in UNRESTRICTED_ROLES) else None
            return await self.tasks.list_tasks(
                offset=offset,
                limit=limit,
                user_id=user_id_filter,
                assigned_to=assigned_to_filter,
                workspace_id=None,
                is_personal=True,
                is_completed=is_completed,
                priority=priority,
                lead_id=lead_id,
                contact_id=contact_id,
                account_id=account_id,
                opportunity_id=opportunity_id,
                search=search,
            )
        else:
            user_id_filter = None if is_manager else current_user.id
            assigned_to_filter = assigned_to if is_manager else None
            return await self.tasks.list_tasks(
                offset=offset,
                limit=limit,
                user_id=user_id_filter,
                assigned_to=assigned_to_filter,
                workspace_id=workspace_id,
                is_personal=False,
                is_completed=is_completed,
                priority=priority,
                lead_id=lead_id,
                contact_id=contact_id,
                account_id=account_id,
                opportunity_id=opportunity_id,
                search=search,
            )
