"""Pydantic v2 schemas for the CRMSyncLog resource."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.pipeline_enums import SyncStatus
from app.schemas.common import ORMBaseModel


class CRMSyncLogCreate(BaseModel):
    crm_platform: str = Field(min_length=1, max_length=100, examples=["Salesforce", "HubSpot"])
    sync_status: SyncStatus = SyncStatus.PENDING


class CRMSyncLogRead(ORMBaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    crm_platform: str
    sync_status: SyncStatus
    timestamp: datetime
