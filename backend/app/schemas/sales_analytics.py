"""Pydantic v2 schemas for the SalesAnalytics resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMBaseModel


class SalesAnalyticsCreate(BaseModel):
    """
    Input for recording a dashboard snapshot. Rows are normally written by
    a scheduled job or on-demand by the Dashboard & Analytics module
    (Module 8), not submitted by end-user clients.
    """

    conversion_rate: float = Field(ge=0, description="Percentage, e.g. 24.8 for 24.8%.")
    pipeline_value: float = Field(ge=0, description="Dollar value of the open pipeline.")


class SalesAnalyticsRead(ORMBaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    conversion_rate: float
    pipeline_value: float
    generated_at: datetime
