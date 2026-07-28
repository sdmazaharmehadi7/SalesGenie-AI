"""
HubSpot CRM provider.

Upserts a Contact via HubSpot's CRM API v3 "upsert by unique property"
endpoint, using email as the idempotency key (HubSpot Contacts are keyed
by email natively). Requires `HUBSPOT_ACCESS_TOKEN` (a private-app or
OAuth2 token with `crm.objects.contacts.write` scope).
"""

import httpx

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import get_logger
from app.integrations.crm.base import CRMProvider, CRMSyncResult

logger = get_logger(__name__)


class HubSpotClient(CRMProvider):
    platform_name = "hubspot"

    def __init__(self) -> None:
        if not settings.HUBSPOT_ACCESS_TOKEN:
            raise ServiceUnavailableError(
                "CRM platform 'hubspot' requires HUBSPOT_ACCESS_TOKEN to be configured.",
                error_code="crm_not_configured",
            )
        self.access_token = settings.HUBSPOT_ACCESS_TOKEN
        self.base_url = settings.HUBSPOT_API_BASE_URL.rstrip("/")
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
        if not email:
            return CRMSyncResult(
                success=False,
                external_record_id=None,
                message="HubSpot sync requires the lead to have an email address.",
            )

        url = f"{self.base_url}/crm/v3/objects/contacts/{email}?idProperty=email"
        firstname = (contact_name or "").split(" ")[0] or None
        lastname = " ".join((contact_name or "").split(" ")[1:]) or None
        payload = {
            "properties": {
                "email": email,
                "company": company_name,
                "firstname": firstname,
                "lastname": lastname,
                "phone": phone,
                "hs_lead_status": lead_status,
            }
        }
        headers = {"Authorization": f"Bearer {self.access_token}"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.patch(url, json=payload, headers=headers)
                if response.status_code == 404:
                    # Contact doesn't exist yet — create it.
                    response = await client.post(
                        f"{self.base_url}/crm/v3/objects/contacts",
                        json=payload,
                        headers=headers,
                    )
                response.raise_for_status()
                body = response.json()
        except httpx.HTTPError as exc:
            logger.error("HubSpot sync failed for lead %s: %s", lead_id, exc)
            return CRMSyncResult(
                success=False, external_record_id=None, message=f"HubSpot sync failed: {exc}"
            )

        return CRMSyncResult(
            success=True,
            external_record_id=body.get("id"),
            message="Contact upserted to HubSpot successfully.",
        )
