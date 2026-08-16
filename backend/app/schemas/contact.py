"""Pydantic v2 schemas for the Contact resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMBaseModel


class ContactBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    job_title: str | None = Field(default=None, max_length=150)
    is_active: bool = True
    account_id: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None


class ContactCreate(ContactBase):
    owner_id: uuid.UUID | None = None


class ContactUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    job_title: str | None = Field(default=None, max_length=150)
    is_active: bool | None = None
    account_id: uuid.UUID | None = None
    lead_id: uuid.UUID | None = None
    owner_id: uuid.UUID | None = None


class ContactRead(ORMBaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str | None
    email: str | None
    phone: str | None
    job_title: str | None
    is_active: bool
    account_id: uuid.UUID | None
    lead_id: uuid.UUID | None
    owner_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class ContactListItem(ORMBaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str | None
    email: str | None
    phone: str | None
    job_title: str | None
    is_active: bool
    account_id: uuid.UUID | None
    lead_id: uuid.UUID | None
    owner_id: uuid.UUID | None
    updated_at: datetime


class PaginatedContacts(BaseModel):
    items: list[ContactListItem]
    total: int
    page: int
    page_size: int
