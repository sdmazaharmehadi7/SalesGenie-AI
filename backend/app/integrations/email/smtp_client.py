"""
Concrete email provider implementations.

- `ConsoleEmailClient`: logs the outgoing email instead of sending it.
  Default (`EMAIL_PROVIDER=console`) so outreach generation/sending is
  fully testable and demoable without any SMTP credentials configured.
- `SMTPEmailClient`: real delivery via `aiosmtplib` (async SMTP), used
  when `EMAIL_PROVIDER=smtp` and `SMTP_HOST`/credentials are set.
"""

import aiosmtplib
from email.message import EmailMessage

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import get_logger
from app.integrations.email.base import EmailProvider

logger = get_logger(__name__)


class ConsoleEmailClient(EmailProvider):
    async def send_email(self, *, to_address: str, subject: str, body: str) -> bool:
        logger.info(
            "Outreach email (console mode — not actually sent)",
            extra={"to": to_address, "subject": subject},
        )
        logger.info("--- EMAIL BODY START ---\n%s\n--- EMAIL BODY END ---", body)
        return True


class SMTPEmailClient(EmailProvider):
    def __init__(self) -> None:
        if not settings.SMTP_HOST:
            raise ServiceUnavailableError(
                "EMAIL_PROVIDER is set to 'smtp' but SMTP_HOST is not configured.",
                error_code="email_not_configured",
            )
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME
        self.password = settings.SMTP_PASSWORD
        self.use_tls = settings.SMTP_USE_TLS
        self.from_address = settings.EMAIL_FROM_ADDRESS
        self.from_name = settings.EMAIL_FROM_NAME

    async def send_email(self, *, to_address: str, subject: str, body: str) -> bool:
        message = EmailMessage()
        message["From"] = f"{self.from_name} <{self.from_address}>"
        message["To"] = to_address
        message["Subject"] = subject
        message.set_content(body)

        try:
            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                start_tls=self.use_tls,
            )
            return True
        except (aiosmtplib.SMTPException, OSError) as exc:
            logger.error("SMTP send failed: %s", exc)
            raise ServiceUnavailableError(
                "Failed to send email via SMTP.", error_code="email_send_failed"
            ) from exc
