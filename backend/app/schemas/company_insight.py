"""Pydantic v2 schemas for the CompanyInsight resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ORMBaseModel


class CompanyInsightCreate(BaseModel):
    """
    Input for manually recording an insight. In practice, most rows are
    produced by the Lead Intelligence AI service (Module 4) rather than
    submitted directly by a client — this schema exists for that service's
    internal use and for any manual override/annotation workflow.
    """

    business_needs: str | None = None
    opportunities: str | None = None
    industry_analysis: str | None = None


class CompanyInsightRead(ORMBaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    business_needs: str | None
    opportunities: str | None
    industry_analysis: str | None
    generated_at: datetime
