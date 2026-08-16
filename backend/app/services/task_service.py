"""Task service — business logic for CRM Tasks with multi-user data isolation."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.pipeline_enums import TaskPriority
from app.models.task import Task
from app.models.user import User, UserRole
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class TaskService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.tasks = TaskRepository(db)

    async def create_task(self, task_in: TaskCreate, current_user: User) -> Task:
        task = await self.tasks.create(task_in, created_by=current_user.id)
        await self.db.commit()
        return task

    async def get_task(self, task_id: uuid.UUID, current_user: User) -> Task:
        task = await self.tasks.get_by_id(task_id)
        if task is None:
            raise NotFoundError("Task not found.", error_code="task_not_found")

        # Multi-user data isolation check
        if (
            current_user.role not in UNRESTRICTED_ROLES
            and task.assigned_to != current_user.id
            and task.created_by != current_user.id
        ):
            raise NotFoundError("Task not found.", error_code="task_not_found")

        return task

    async def update_task(
        self, task_id: uuid.UUID, task_in: TaskUpdate, current_user: User
    ) -> Task:
        task = await self.get_task(task_id, current_user)
        updated = await self.tasks.update(task, task_in)
        await self.db.commit()
        return updated

    async def toggle_complete(self, task_id: uuid.UUID, current_user: User) -> Task:
        task = await self.get_task(task_id, current_user)
        updated = await self.tasks.toggle_complete(task)
        await self.db.commit()
        return updated

    async def delete_task(self, task_id: uuid.UUID, current_user: User) -> None:
        task = await self.get_task(task_id, current_user)
        await self.tasks.delete(task)
        await self.db.commit()

    async def list_tasks(
        self,
        current_user: User,
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
        user_id_filter = current_user.id if current_user.role not in UNRESTRICTED_ROLES else None
        assigned_to_filter = assigned_to if (current_user.role in UNRESTRICTED_ROLES) else None

        return await self.tasks.list_tasks(
            offset=offset,
            limit=limit,
            user_id=user_id_filter,
            assigned_to=assigned_to_filter,
            is_completed=is_completed,
            priority=priority,
            lead_id=lead_id,
            contact_id=contact_id,
            account_id=account_id,
            opportunity_id=opportunity_id,
            search=search,
        )
