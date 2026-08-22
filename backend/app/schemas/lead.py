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
    deal_value: Decimal | None = Field(default=None, ge=Decimal(0))


class LeadCreate(LeadBase):
    lead_status: LeadStatus = LeadStatus.NEW
    # Workspace context (resolved from query param by service layer)
    workspace_id: uuid.UUID | None = None
    # Legacy V1 field — still accepted; service layer also reads assigned_to
    owner_id: uuid.UUID | None = None
    # Explicit workspace-aware fields
    assigned_to: uuid.UUID | None = None  # who to assign; falls back to owner_id then creator


class LeadUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=150)
    contact_name: str | None = Field(default=None, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    deal_value: Decimal | None = Field(default=None, ge=Decimal(0))
    lead_status: LeadStatus | None = None
    # Legacy V1 field — kept so existing clients don't break
    owner_id: uuid.UUID | None = None
    # Explicit workspace-aware assignment field
    assigned_to: uuid.UUID | None = None


class LeadRead(ORMBaseModel):
    id: uuid.UUID
    company_name: str
    industry: str | None
    contact_name: str | None
    email: str | None
    phone: str | None
    deal_value: Decimal | None
    lead_status: LeadStatus
    workspace_id: uuid.UUID | None = None
    # Ownership / assignment
    owner_id: uuid.UUID | None          # legacy field, still returned
    created_by: uuid.UUID | None = None # who created this lead
    assigned_to: uuid.UUID | None = None # who it is currently assigned to
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
    workspace_id: uuid.UUID | None = None
    # Ownership / assignment
    owner_id: uuid.UUID | None
    created_by: uuid.UUID | None = None
    assigned_to: uuid.UUID | None = None
    updated_at: datetime


class PaginatedLeads(BaseModel):
    items: list[LeadListItem]
    total: int
    page: int
    page_size: int
