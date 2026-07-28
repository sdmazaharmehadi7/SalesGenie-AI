"""Pydantic v2 schemas for the Lead resource."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

from app.models.pipeline_enums import LeadStatus
from app.schemas.common import ORMBaseModel


class LeadBase(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=150)
    contact_name: str | None = Field(default=None, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    deal_value: Decimal | None = Field(default=None, ge=0)


class LeadCreate(LeadBase):
    lead_status: LeadStatus = LeadStatus.NEW
    owner_id: uuid.UUID | None = None


class LeadUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=150)
    contact_name: str | None = Field(default=None, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    deal_value: Decimal | None = Field(default=None, ge=0)
    lead_status: LeadStatus | None = None
    owner_id: uuid.UUID | None = None


class LeadRead(ORMBaseModel):
    id: uuid.UUID
    company_name: str
    industry: str | None
    contact_name: str | None
    email: str | None
    phone: str | None
    deal_value: Decimal | None
    lead_status: LeadStatus
    owner_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class LeadListItem(ORMBaseModel):
    """Slimmer shape for list/table views (e.g. the pipeline board)."""

    id: uuid.UUID
    company_name: str
    industry: str | None
    contact_name: str | None
    email: str | None
    phone: str | None
    deal_value: Decimal | None
    lead_status: LeadStatus
    owner_id: uuid.UUID | None
    updated_at: datetime


class PaginatedLeads(BaseModel):
    items: list[LeadListItem]
    total: int
    page: int
    page_size: int
