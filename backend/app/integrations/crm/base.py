"""
CRM provider abstraction.

`CRMIntegrationService` depends on this interface only. Every sync
attempt — successful or failed — is recorded as a `CRMSyncLog` row by the
service layer, using the `CRMSyncResult` this interface returns.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class CRMSyncResult:
    success: bool
    external_record_id: str | None
    message: str


class CRMProvider(ABC):
    platform_name: str

    @abstractmethod
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
        raise NotImplementedError
