"""Factory for the configured `EmailProvider` implementation."""

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.integrations.email.base import EmailProvider
from app.integrations.email.smtp_client import ConsoleEmailClient, SMTPEmailClient


def get_email_provider() -> EmailProvider:
    """
    Return the correct EmailProvider based on EMAIL_PROVIDER setting.

    No @lru_cache here — settings are re-read on every call so that
    uvicorn --reload picks up .env changes without requiring a manual restart.
    """
    if settings.EMAIL_PROVIDER == "console":
        return ConsoleEmailClient()
    if settings.EMAIL_PROVIDER == "smtp":
        return SMTPEmailClient()
    raise ServiceUnavailableError(
        f"Unknown EMAIL_PROVIDER '{settings.EMAIL_PROVIDER}'. Expected 'console' or 'smtp'.",
        error_code="email_misconfigured",
    )
