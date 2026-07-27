"""Pydantic v2 schemas for the LeadScore resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMBaseModel


class LeadScoreCreate(BaseModel):
    """
    Input for recording a scoring snapshot. As with `CompanyInsight`, rows
    are normally produced by the Lead Scoring & Recommendation Engine
    (Module 6) — this schema is what that service passes to the
    repository layer.
    """

    lead_score: int = Field(ge=0, le=100)
    conversion_probability: float = Field(ge=0.0, le=1.0)


class LeadScoreRead(ORMBaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    lead_score: int
    conversion_probability: float
    generated_at: datetime
