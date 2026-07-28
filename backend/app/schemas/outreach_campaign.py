"""Pydantic v2 schemas for the OutreachCampaign resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.pipeline_enums import CampaignStatus
from app.schemas.common import ORMBaseModel


class OutreachCampaignCreate(BaseModel):
    email_subject: str = Field(min_length=1, max_length=255)
    email_content: str = Field(min_length=1)
    campaign_status: CampaignStatus = CampaignStatus.DRAFT


class OutreachCampaignUpdate(BaseModel):
    """
    Typically used to transition `campaign_status` as delivery events come
    in (sent -> opened -> replied/bounced), and/or to edit a still-draft
    email before it's sent.
    """

    email_subject: str | None = Field(default=None, min_length=1, max_length=255)
    email_content: str | None = Field(default=None, min_length=1)
    campaign_status: CampaignStatus | None = None


class OutreachCampaignRead(ORMBaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    email_subject: str
    email_content: str
    campaign_status: CampaignStatus
    created_at: datetime
    updated_at: datetime
