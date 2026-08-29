"""Pydantic schemas for the Notifications module."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.notification import NotificationType
from app.schemas.common import ORMBaseModel


class NotificationBase(BaseModel):
    type: str
    title: str = Field(min_length=1, max_length=255)
    message: str
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    data: dict[str, Any] | None = None


class NotificationCreate(NotificationBase):
    user_id: uuid.UUID
    workspace_id: uuid.UUID | None = None
    idempotency_key: str | None = None


class NotificationRead(ORMBaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    workspace_id: uuid.UUID | None = None
    type: str
    title: str
    message: str
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    data: dict[str, Any] | None = None
    is_read: bool
    created_at: datetime


class NotificationListItem(ORMBaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    workspace_id: uuid.UUID | None = None
    type: str
    title: str
    message: str
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    data: dict[str, Any] | None = None
    is_read: bool
    created_at: datetime


class PaginatedNotifications(BaseModel):
    items: list[NotificationListItem]
    total: int
    page: int
    page_size: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class NotificationPreferenceRead(ORMBaseModel):
    user_id: uuid.UUID
    lead_assigned_inapp: bool
    lead_status_changed_inapp: bool
    email_opened_inapp: bool
    email_replied_inapp: bool
    meeting_reminder_inapp: bool
    weekly_digest_inapp: bool
    ai_insights_inapp: bool
    team_mentions_inapp: bool
    lead_assigned_email: bool


class NotificationPreferenceUpdate(BaseModel):
    lead_assigned_inapp: bool | None = None
    lead_status_changed_inapp: bool | None = None
    email_opened_inapp: bool | None = None
    email_replied_inapp: bool | None = None
    meeting_reminder_inapp: bool | None = None
    weekly_digest_inapp: bool | None = None
    ai_insights_inapp: bool | None = None
    team_mentions_inapp: bool | None = None
    lead_assigned_email: bool | None = None
