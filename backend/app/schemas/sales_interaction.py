"""Pydantic v2 schemas for the SalesInteraction / Activity resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.pipeline_enums import InteractionType
from app.schemas.common import ORMBaseModel


class SalesInteractionCreate(BaseModel):
    interaction_type: InteractionType = InteractionType.OTHER
    summary: str | None = None
    action_items: list[str] | None = None
    lead_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    opportunity_id: uuid.UUID | None = None


class SalesInteractionRead(ORMBaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID | None
    contact_id: uuid.UUID | None
    account_id: uuid.UUID | None
    opportunity_id: uuid.UUID | None
    interaction_type: InteractionType
    summary: str | None
    action_items: list[str] | None
    interaction_date: datetime


class ActivityListItem(ORMBaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID | None
    contact_id: uuid.UUID | None
    account_id: uuid.UUID | None
    opportunity_id: uuid.UUID | None
    interaction_type: InteractionType
    summary: str | None
    action_items: list[str] | None
    interaction_date: datetime
