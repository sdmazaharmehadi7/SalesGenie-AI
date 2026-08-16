"""Pydantic v2 schemas for the Opportunity resource."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.pipeline_enums import OpportunityStage
from app.schemas.common import ORMBaseModel


class OpportunityBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    amount: Decimal | None = Field(default=None, ge=0)
    stage: OpportunityStage = OpportunityStage.NEW
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close_date: date | None = None
    notes: str | None = None
    account_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None


class OpportunityCreate(OpportunityBase):
    owner_id: uuid.UUID | None = None


class OpportunityUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    amount: Decimal | None = Field(default=None, ge=0)
    stage: OpportunityStage | None = None
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close_date: date | None = None
    notes: str | None = None
    is_closed: bool | None = None
    is_won: bool | None = None
    account_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    owner_id: uuid.UUID | None = None


class OpportunityStageUpdate(BaseModel):
    stage: OpportunityStage


class OpportunityRead(ORMBaseModel):
    id: uuid.UUID
    name: str
    amount: Decimal | None
    stage: OpportunityStage
    probability: int | None
    expected_close_date: date | None
    notes: str | None
    is_closed: bool
    is_won: bool
    account_id: uuid.UUID | None
    contact_id: uuid.UUID | None
    lead_id: uuid.UUID | None
    owner_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class OpportunityListItem(ORMBaseModel):
    id: uuid.UUID
    name: str
    amount: Decimal | None
    stage: OpportunityStage
    probability: int | None
    expected_close_date: date | None
    is_closed: bool
    is_won: bool
    account_id: uuid.UUID | None
    contact_id: uuid.UUID | None
    lead_id: uuid.UUID | None
    owner_id: uuid.UUID | None
    updated_at: datetime


class PaginatedOpportunities(BaseModel):
    items: list[OpportunityListItem]
    total: int
    page: int
    page_size: int


class PipelineColumn(BaseModel):
    stage: OpportunityStage
    stage_name: str
    opportunities: list[OpportunityListItem]
    total_amount: Decimal
    count: int


class PipelineBoardView(BaseModel):
    columns: list[PipelineColumn]
    total_pipeline_value: Decimal
    total_deals_count: int
