"""Pydantic v2 schemas for the SalesInteraction resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.pipeline_enums import InteractionType
from app.schemas.common import ORMBaseModel


class SalesInteractionCreate(BaseModel):
    interaction_type: InteractionType = InteractionType.OTHER
    summary: str | None = None
    # Each item is a short free-text action item, e.g.
    # "Send technical architecture document and integration guide".
    # Kept as a flat list of strings rather than nested objects — due
    # dates/owners for an action item are tracked as separate follow-up
    # records once the CRM Integration module needs them, not embedded
    # here.
    action_items: list[str] | None = None


class SalesInteractionRead(ORMBaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    interaction_type: InteractionType
    summary: str | None
    action_items: list[str] | None
    interaction_date: datetime
