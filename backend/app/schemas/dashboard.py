"""Pydantic v2 schemas for the Sales Analytics dashboard."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.pipeline_enums import LeadStatus
from app.schemas.common import ORMBaseModel


class PipelineStageBreakdown(BaseModel):
    status: LeadStatus
    count: int


class DashboardSummary(BaseModel):
    conversion_rate: Decimal
    pipeline_value: Decimal
    total_leads: int
    stages: list[PipelineStageBreakdown]


class SnapshotHistoryItem(ORMBaseModel):
    id: uuid.UUID
    conversion_rate: Decimal
    pipeline_value: Decimal
    generated_at: datetime
