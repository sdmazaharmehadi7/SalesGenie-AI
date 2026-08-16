"""Tasks endpoints (CRM)."""

import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentActiveUser, DBSession, Pagination
from app.models.pipeline_enums import TaskPriority
from app.schemas.task import (
    PaginatedTasks,
    TaskCreate,
    TaskListItem,
    TaskRead,
    TaskUpdate,
)
from app.services.task_service import TaskService

router = APIRouter()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED, summary="Create a task")
async def create_task(task_in: TaskCreate, db: DBSession, current_user: CurrentActiveUser) -> TaskRead:
    task = await TaskService(db).create_task(task_in, current_user)
    return TaskRead.model_validate(task)


@router.get("", response_model=PaginatedTasks, summary="List tasks")
async def list_tasks(
    db: DBSession,
    current_user: CurrentActiveUser,
    pagination: Pagination,
    is_completed: bool | None = None,
    priority: TaskPriority | None = None,
    lead_id: uuid.UUID | None = None,
    contact_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
    opportunity_id: uuid.UUID | None = None,
    search: str | None = None,
    assigned_to: uuid.UUID | None = None,
) -> PaginatedTasks:
    tasks, total = await TaskService(db).list_tasks(
        current_user,
        offset=pagination.offset,
        limit=pagination.page_size,
        is_completed=is_completed,
        priority=priority,
        lead_id=lead_id,
        contact_id=contact_id,
        account_id=account_id,
        opportunity_id=opportunity_id,
        search=search,
        assigned_to=assigned_to,
    )
    return PaginatedTasks(
        items=[TaskListItem.model_validate(t) for t in tasks],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{task_id}", response_model=TaskRead, summary="Get task details")
async def get_task(task_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> TaskRead:
    task = await TaskService(db).get_task(task_id, current_user)
    return TaskRead.model_validate(task)


@router.patch("/{task_id}", response_model=TaskRead, summary="Update a task")
async def update_task(
    task_id: uuid.UUID, task_in: TaskUpdate, db: DBSession, current_user: CurrentActiveUser
) -> TaskRead:
    task = await TaskService(db).update_task(task_id, task_in, current_user)
    return TaskRead.model_validate(task)


@router.patch("/{task_id}/complete", response_model=TaskRead, summary="Toggle task completion")
async def toggle_task_complete(task_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> TaskRead:
    task = await TaskService(db).toggle_complete(task_id, current_user)
    return TaskRead.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a task")
async def delete_task(task_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> None:
    await TaskService(db).delete_task(task_id, current_user)
