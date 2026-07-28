"""
Factory for CRM provider implementations.

Unlike the AI/email/calendar factories (one active provider per app,
chosen by settings), CRM platform is chosen per-sync-request (a lead
might sync to Salesforce for one org and HubSpot for another), so this
factory takes the platform name as an argument rather than reading a
single `CRM_DEFAULT_PLATFORM` setting — though that setting is used as
the default when the caller doesn't specify one.
"""

from app.core.config import settings
from app.core.exceptions import ValidationAppError
from app.integrations.crm.base import CRMProvider
from app.integrations.crm.hubspot_client import HubSpotClient
from app.integrations.crm.mock_client import MockCRMClient
from app.integrations.crm.salesforce_client import SalesforceClient

_PROVIDERS: dict[str, type[CRMProvider]] = {
    "mock": MockCRMClient,
    "salesforce": SalesforceClient,
    "hubspot": HubSpotClient,
}


def get_crm_provider(platform: str | None = None) -> CRMProvider:
    platform_name = (platform or settings.CRM_DEFAULT_PLATFORM).lower()
    provider_cls = _PROVIDERS.get(platform_name)
    if provider_cls is None:
        raise ValidationAppError(
            f"Unsupported CRM platform '{platform_name}'. "
            f"Supported platforms: {', '.join(_PROVIDERS.keys())}.",
            error_code="unsupported_crm_platform",
        )
    return provider_cls()
