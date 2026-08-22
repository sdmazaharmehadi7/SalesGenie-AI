"""Pydantic v2 schemas for the Task resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.pipeline_enums import TaskPriority
from app.schemas.common import ORMBaseModel


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    due_date: datetime | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    assigned_to: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    opportunity_id: uuid.UUID | None = None
    workspace_id: uuid.UUID | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    due_date: datetime | None = None
    priority: TaskPriority | None = None
    is_completed: bool | None = None
    assigned_to: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    opportunity_id: uuid.UUID | None = None
    workspace_id: uuid.UUID | None = None


class TaskRead(ORMBaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    due_date: datetime | None
    is_completed: bool
    completed_at: datetime | None
    priority: TaskPriority
    assigned_to: uuid.UUID | None
    created_by: uuid.UUID | None
    lead_id: uuid.UUID | None
    contact_id: uuid.UUID | None
    account_id: uuid.UUID | None
    opportunity_id: uuid.UUID | None
    workspace_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class TaskListItem(ORMBaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    due_date: datetime | None
    is_completed: bool
    completed_at: datetime | None
    priority: TaskPriority
    assigned_to: uuid.UUID | None
    lead_id: uuid.UUID | None
    contact_id: uuid.UUID | None
    account_id: uuid.UUID | None
    opportunity_id: uuid.UUID | None
    workspace_id: uuid.UUID | None = None
    updated_at: datetime


class PaginatedTasks(BaseModel):
    items: list[TaskListItem]
    total: int
    page: int
    page_size: int
