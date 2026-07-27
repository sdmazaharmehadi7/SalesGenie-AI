"""
CRM Integration service (Module 7 — the CRM-sync half of Conversation
Intelligence & CRM Integration).

Every sync attempt is logged via `CRMSyncLogRepository`, success or
failure, so the CRM Sync Status panel in the platform mockup has a full
audit trail to render.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.crm.factory import get_crm_provider
from app.models.crm_sync_log import CRMSyncLog
from app.models.pipeline_enums import SyncStatus
from app.repositories.crm_sync_log_repository import CRMSyncLogRepository
from app.services.lead_service import LeadService


class CRMIntegrationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.sync_logs = CRMSyncLogRepository(db)
        self.lead_service = LeadService(db)

    async def sync_lead(
        self, lead_id: uuid.UUID, current_user, *, platform: str | None = None
    ) -> CRMSyncLog:
        lead = await self.lead_service.get_lead(lead_id, current_user)
        provider = get_crm_provider(platform)

        result = await provider.sync_lead(
            lead_id=str(lead.id),
            company_name=lead.company_name,
            contact_name=lead.contact_name,
            email=lead.email,
            phone=lead.phone,
            lead_status=lead.lead_status.value,
        )

        log = await self.sync_logs.create(
            lead.id,
            crm_platform=provider.platform_name,
            sync_status=SyncStatus.SUCCESS if result.success else SyncStatus.FAILED,
        )
        await self.db.commit()
        return log

    async def list_sync_history(self, lead_id: uuid.UUID, current_user) -> list[CRMSyncLog]:
        await self.lead_service.get_lead(lead_id, current_user)
        return await self.sync_logs.list_for_lead(lead_id)
