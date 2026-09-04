"""Pydantic schemas for Follow-Up management."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, computed_field, model_validator

from app.models.pipeline_enums import TaskPriority
from app.models.task import compute_follow_up_status
from app.schemas.common import ORMBaseModel


class FollowUpBase(BaseModel):
    title: str = Field(default="Follow-up", min_length=1, max_length=255)
    notes: str | None = Field(default=None, description="Optional notes or details for the follow-up")
    due_date: datetime = Field(description="Scheduled follow-up date and time (ISO format)")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    assigned_to: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    opportunity_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None


class FollowUpCreate(FollowUpBase):
    @model_validator(mode="after")
    def validate_entity_link(self) -> "FollowUpCreate":
        if not (self.lead_id or self.opportunity_id or self.contact_id or self.account_id):
            raise ValueError("Follow-up must be linked to a Lead, Opportunity, Contact, or Account.")
        return self


class FollowUpUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    notes: str | None = None
    due_date: datetime | None = None
    priority: TaskPriority | None = None
    assigned_to: uuid.UUID | None = None


class FollowUpReschedule(BaseModel):
    due_date: datetime = Field(description="New scheduled follow-up date and time")
    notes: str | None = Field(default=None, description="Optional note explaining reschedule reason")


class FollowUpRead(ORMBaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    due_date: datetime | None
    is_completed: bool
    completed_at: datetime | None
    rescheduled_at: datetime | None = None
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

    # Entity preview metadata for convenient UI rendering
    entity_name: str | None = None
    assignee_name: str | None = None

    @computed_field
    def notes(self) -> str | None:
        """Alias description as notes for follow-up terminology."""
        return self.description

    @computed_field
    def status(self) -> str:
        """Dynamically computed status: UPCOMING, DUE, OVERDUE, COMPLETED, RESCHEDULED."""
        return compute_follow_up_status(self.due_date, self.is_completed, self.rescheduled_at)


class PaginatedFollowUps(BaseModel):
    items: list[FollowUpRead]
    total: int
    page: int
    page_size: int


class FollowUpSummary(BaseModel):
    upcoming: int
    due: int
    overdue: int
    completed: int
    total_active: int
