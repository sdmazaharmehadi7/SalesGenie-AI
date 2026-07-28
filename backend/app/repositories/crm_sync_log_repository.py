"""
CRMSyncLog repository — data access for the `crm_sync_logs` table.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm_sync_log import CRMSyncLog
from app.models.pipeline_enums import SyncStatus


class CRMSyncLogRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self, lead_id: uuid.UUID, crm_platform: str, sync_status: SyncStatus
    ) -> CRMSyncLog:
        log = CRMSyncLog(lead_id=lead_id, crm_platform=crm_platform, sync_status=sync_status)
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def list_for_lead(self, lead_id: uuid.UUID) -> list[CRMSyncLog]:
        result = await self.db.execute(
            select(CRMSyncLog)
            .where(CRMSyncLog.lead_id == lead_id)
            .order_by(CRMSyncLog.timestamp.desc())
        )
        return list(result.scalars().all())
