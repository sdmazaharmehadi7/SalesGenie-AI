"""Pydantic v2 schemas for the Account resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMBaseModel


class AccountBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=150)
    website: str | None = Field(default=None, max_length=255)
    company_size: str | None = Field(default=None, max_length=50)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = None
    description: str | None = None


class AccountCreate(AccountBase):
    owner_id: uuid.UUID | None = None


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=150)
    website: str | None = Field(default=None, max_length=255)
    company_size: str | None = Field(default=None, max_length=50)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = None
    description: str | None = None
    owner_id: uuid.UUID | None = None


class AccountRead(ORMBaseModel):
    id: uuid.UUID
    name: str
    industry: str | None
    website: str | None
    company_size: str | None
    phone: str | None
    address: str | None
    description: str | None
    owner_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class AccountListItem(ORMBaseModel):
    id: uuid.UUID
    name: str
    industry: str | None
    website: str | None
    company_size: str | None
    phone: str | None
    owner_id: uuid.UUID | None
    updated_at: datetime


class PaginatedAccounts(BaseModel):
    items: list[AccountListItem]
    total: int
    page: int
    page_size: int
