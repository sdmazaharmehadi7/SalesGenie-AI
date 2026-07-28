"""
Salesforce CRM provider.

Upserts a Lead record via the Salesforce REST API's external-id-based
upsert endpoint (`PATCH /sobjects/Lead/<external id field>/<value>`),
using the platform's own `lead_id` (a UUID) as the external id, so
repeated syncs of the same lead update the same Salesforce record instead
of duplicating it. Requires `SALESFORCE_INSTANCE_URL` and
`SALESFORCE_ACCESS_TOKEN` (a valid OAuth2 access token) to be configured;
obtaining/refreshing that token is out of scope for this client.
"""

import httpx

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import get_logger
from app.integrations.crm.base import CRMProvider, CRMSyncResult

logger = get_logger(__name__)

SALESFORCE_API_VERSION = "v60.0"
# Custom external-id field expected to exist on the Salesforce Lead object,
# used to make sync idempotent per platform lead.
EXTERNAL_ID_FIELD = "SalesGenie_Lead_Id__c"


class SalesforceClient(CRMProvider):
    platform_name = "salesforce"

    def __init__(self) -> None:
        if not settings.SALESFORCE_INSTANCE_URL or not settings.SALESFORCE_ACCESS_TOKEN:
            raise ServiceUnavailableError(
                "CRM platform 'salesforce' requires SALESFORCE_INSTANCE_URL and "
                "SALESFORCE_ACCESS_TOKEN to be configured.",
                error_code="crm_not_configured",
            )
        self.instance_url = settings.SALESFORCE_INSTANCE_URL.rstrip("/")
        self.access_token = settings.SALESFORCE_ACCESS_TOKEN
        self.timeout_seconds = settings.CRM_REQUEST_TIMEOUT_SECONDS

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
        url = (
            f"{self.instance_url}/services/data/{SALESFORCE_API_VERSION}"
            f"/sobjects/Lead/{EXTERNAL_ID_FIELD}/{lead_id}"
        )
        last_name = (contact_name or company_name).split(" ")[-1]
        first_name = " ".join((contact_name or "").split(" ")[:-1]) or None
        payload = {
            "Company": company_name,
            "LastName": last_name,
            "FirstName": first_name,
            "Email": email,
            "Phone": phone,
            "Status": lead_status,
        }
        headers = {"Authorization": f"Bearer {self.access_token}"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.patch(url, json=payload, headers=headers)
                if response.status_code not in (200, 201, 204):
                    response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error("Salesforce sync failed for lead %s: %s", lead_id, exc)
            return CRMSyncResult(
                success=False, external_record_id=None, message=f"Salesforce sync failed: {exc}"
            )

        external_id = None
        if response.status_code == 201:
            try:
                external_id = response.json().get("id")
            except ValueError:
                pass

        return CRMSyncResult(
            success=True,
            external_record_id=external_id,
            message="Lead upserted to Salesforce successfully.",
        )
