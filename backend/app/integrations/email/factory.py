"""Factory for the configured `EmailProvider` implementation."""

from functools import lru_cache

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.integrations.email.base import EmailProvider
from app.integrations.email.smtp_client import ConsoleEmailClient, SMTPEmailClient


@lru_cache
def get_email_provider() -> EmailProvider:
    if settings.EMAIL_PROVIDER == "console":
        return ConsoleEmailClient()
    if settings.EMAIL_PROVIDER == "smtp":
        return SMTPEmailClient()
    raise ServiceUnavailableError(
        f"Unknown EMAIL_PROVIDER '{settings.EMAIL_PROVIDER}'. Expected 'console' or 'smtp'.",
        error_code="email_misconfigured",
    )
