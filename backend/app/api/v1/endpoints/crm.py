"""
CRM Integration endpoints (Module 7 — CRM-sync half).
"""

import uuid

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentActiveUser, DBSession
from app.schemas.crm_sync_log import CRMSyncLogRead
from app.services.crm_integration_service import CRMIntegrationService

router = APIRouter()


@router.post(
    "/{lead_id}/sync",
    response_model=CRMSyncLogRead,
    status_code=status.HTTP_201_CREATED,
    summary="Sync a lead to an external CRM platform",
)
async def sync_lead_to_crm(
    lead_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    platform: str | None = Query(
        default=None, description="CRM platform to sync to (defaults to CRM_DEFAULT_PLATFORM)."
    ),
) -> CRMSyncLogRead:
    log = await CRMIntegrationService(db).sync_lead(lead_id, current_user, platform=platform)
    return CRMSyncLogRead.model_validate(log)


@router.get(
    "/{lead_id}/sync-history",
    response_model=list[CRMSyncLogRead],
    summary="List CRM sync attempts for a lead",
)
async def list_sync_history(
    lead_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser
) -> list[CRMSyncLogRead]:
    logs = await CRMIntegrationService(db).list_sync_history(lead_id, current_user)
    return [CRMSyncLogRead.model_validate(log) for log in logs]
