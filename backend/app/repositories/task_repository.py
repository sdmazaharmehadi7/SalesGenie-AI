"""Task repository — data access for the `tasks` table."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pipeline_enums import TaskPriority
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


class TaskRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        return await self.db.get(Task, task_id)

    async def create(self, task_in: TaskCreate, created_by: uuid.UUID | None) -> Task:
        task = Task(
            title=task_in.title,
            description=task_in.description,
            due_date=task_in.due_date,
            priority=task_in.priority,
            assigned_to=task_in.assigned_to or created_by,
            created_by=created_by,
            lead_id=task_in.lead_id,
            contact_id=task_in.contact_id,
            account_id=task_in.account_id,
            opportunity_id=task_in.opportunity_id,
        )
        self.db.add(task)
        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def update(self, task: Task, task_in: TaskUpdate) -> Task:
        update_data = task_in.model_dump(exclude_unset=True)
        if "is_completed" in update_data:
            if update_data["is_completed"] and not task.is_completed:
                task.completed_at = datetime.now(timezone.utc)
            elif not update_data["is_completed"]:
                task.completed_at = None

        for field, value in update_data.items():
            setattr(task, field, value)

        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def toggle_complete(self, task: Task) -> Task:
        task.is_completed = not task.is_completed
        task.completed_at = datetime.now(timezone.utc) if task.is_completed else None
        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def delete(self, task: Task) -> None:
        await self.db.delete(task)
        await self.db.flush()

    async def list_tasks(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        user_id: uuid.UUID | None = None,
        assigned_to: uuid.UUID | None = None,
        is_completed: bool | None = None,
        priority: TaskPriority | None = None,
        lead_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        opportunity_id: uuid.UUID | None = None,
        search: str | None = None,
    ) -> tuple[list[Task], int]:
        filters = []
        if user_id is not None:
            # Match either assigned to or created by user
            filters.append(or_(Task.assigned_to == user_id, Task.created_by == user_id))
        elif assigned_to is not None:
            filters.append(Task.assigned_to == assigned_to)

        if is_completed is not None:
            filters.append(Task.is_completed == is_completed)
        if priority is not None:
            filters.append(Task.priority == priority)
        if lead_id is not None:
            filters.append(Task.lead_id == lead_id)
        if contact_id is not None:
            filters.append(Task.contact_id == contact_id)
        if account_id is not None:
            filters.append(Task.account_id == account_id)
        if opportunity_id is not None:
            filters.append(Task.opportunity_id == opportunity_id)
        if search:
            like_pattern = f"%{search}%"
            filters.append(
                or_(
                    Task.title.ilike(like_pattern),
                    Task.description.ilike(like_pattern),
                )
            )

        base_query = select(Task)
        count_query = select(func.count()).select_from(Task)
        for condition in filters:
            base_query = base_query.where(condition)
            count_query = count_query.where(condition)

        total = (await self.db.execute(count_query)).scalar_one()

        result = await self.db.execute(
            base_query.order_by(
                Task.is_completed.asc(),
                Task.due_date.asc().nulls_last(),
                Task.updated_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        tasks = list(result.scalars().all())
        return tasks, total

    async def list_upcoming(
        self,
        assigned_to: uuid.UUID | None = None,
        user_id: uuid.UUID | None = None,
        limit: int = 10,
    ) -> list[Task]:
        query = select(Task).where(Task.is_completed == False)  # noqa: E712
        if user_id is not None:
            query = query.where(or_(Task.assigned_to == user_id, Task.created_by == user_id))
        elif assigned_to is not None:
            query = query.where(Task.assigned_to == assigned_to)

        result = await self.db.execute(
            query.order_by(Task.due_date.asc().nulls_last(), Task.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())
