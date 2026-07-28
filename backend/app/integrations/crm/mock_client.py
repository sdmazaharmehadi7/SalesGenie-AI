"""Mock CRM provider — default so CRM sync is fully testable out of the box."""

import uuid

from app.core.logging import get_logger
from app.integrations.crm.base import CRMProvider, CRMSyncResult

logger = get_logger(__name__)


class MockCRMClient(CRMProvider):
    platform_name = "mock"

    async def sync_lead(
        self,
        *,
        lead_id: str,
        company_name: str,
        contact_name: str | None,
        email: str | None,
        phone: str | None,
        lead_status: str,
    ) -> CRMSyncResult:
        external_id = f"mock-{uuid.uuid4().hex[:12]}"
        logger.info(
            "CRM sync (mock mode — not synced to a real CRM)",
            extra={"lead_id": lead_id, "external_id": external_id, "company_name": company_name},
        )
        return CRMSyncResult(
            success=True,
            external_record_id=external_id,
            message=f"Lead synced to mock CRM as {external_id}.",
        )
