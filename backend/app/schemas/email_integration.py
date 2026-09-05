"""
Pydantic schemas for Gmail Email Integration.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class GmailAuthUrlResponse(BaseModel):
    auth_url: str
    state: str


class GmailCallbackRequest(BaseModel):
    code: str = Field(min_length=1)
    state: str = Field(min_length=1)
    redirect_uri: str | None = None


class GmailStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    is_connected: bool
    provider: str = "GMAIL"
    provider_email: str | None = None
    status: str
    scopes: list[str] | None = None
    last_synced_at: datetime | None = None
    last_error_message: str | None = None


class GmailTestResponse(BaseModel):
    success: bool
    message: str
    provider_email: str | None = None


class GmailSendRequest(BaseModel):
    lead_id: uuid.UUID | None = None
    to_email: str = Field(min_length=3)
    subject: str = Field(min_length=1, max_length=500)
    body: str = Field(min_length=1)
    in_reply_to: str | None = None
    thread_id: str | None = None
    track_opens: bool = True


class GmailSendResponse(BaseModel):
    success: bool
    message_id: str | None = None
    thread_id: str | None = None
    interaction_id: uuid.UUID | None = None
    detail: str = "Email sent successfully via Gmail."


class GmailSyncResponse(BaseModel):
    success: bool
    synced_count: int
    new_replies_count: int
    last_synced_at: datetime
    message: str
