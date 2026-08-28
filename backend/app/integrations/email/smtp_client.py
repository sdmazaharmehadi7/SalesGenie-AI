"""
Concrete email provider implementations.

- `ConsoleEmailClient`: logs the outgoing email instead of sending it.
  Default (`EMAIL_PROVIDER=console`) so outreach generation/sending is
  fully testable and demoable without any SMTP credentials configured.
- `SMTPEmailClient`: real delivery via `aiosmtplib` (async SMTP), used
  when `EMAIL_PROVIDER=smtp` and `SMTP_HOST`/credentials are set.

Gmail notes:
- Use smtp.gmail.com:587 with STARTTLS (start_tls=True). Do NOT use SSL on port 465
  with aiosmtplib unless you explicitly pass use_tls=True for the entire connection.
- The From address MUST match the authenticated SMTP_USERNAME Gmail account.
- Use a 16-character App Password (not your regular Gmail password).
"""

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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
        # SMTP_USE_TLS=true means STARTTLS on port 587 (not SSL wrapping on 465)
        self.start_tls = settings.SMTP_USE_TLS
        self.from_address = settings.EMAIL_FROM_ADDRESS
        self.from_name = settings.EMAIL_FROM_NAME

        logger.info(
            "SMTPEmailClient initialized | host=%s port=%s username=%s from=%s start_tls=%s",
            self.host,
            self.port,
            self.username,
            self.from_address,
            self.start_tls,
        )

    async def send_email(self, *, to_address: str, subject: str, body: str) -> bool:
        # Build a proper MIME message so Gmail doesn't reject or mangle it
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{self.from_name} <{self.from_address}>"
        msg["To"] = to_address
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        logger.info(
            "Attempting SMTP send | to=%s subject=%s host=%s port=%s",
            to_address,
            subject,
            self.host,
            self.port,
        )

        try:
            # aiosmtplib.send() with start_tls=True issues EHLO → STARTTLS → AUTH
            # This is the correct mode for smtp.gmail.com:587
            errors, response = await aiosmtplib.send(
                msg,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                start_tls=self.start_tls,
                timeout=20,
            )

            if errors:
                # errors is a dict of {recipient: (code, message)} for any failures
                failed = {k: v for k, v in errors.items() if v[0] >= 400}
                if failed:
                    logger.error("SMTP recipient errors: %s", failed)
                    raise ServiceUnavailableError(
                        f"Failed to deliver to: {', '.join(failed.keys())}",
                        error_code="email_delivery_failed",
                    )

            logger.info(
                "SMTP send SUCCESS | to=%s | server response: %s",
                to_address,
                response,
            )
            return True

        except aiosmtplib.SMTPAuthenticationError as exc:
            logger.error(
                "SMTP authentication failed (check SMTP_USERNAME / SMTP_PASSWORD / App Password): %s", exc
            )
            raise ServiceUnavailableError(
                "SMTP authentication failed. Verify your Gmail App Password.",
                error_code="email_auth_failed",
            ) from exc

        except aiosmtplib.SMTPConnectError as exc:
            logger.error("SMTP connection error (check SMTP_HOST / SMTP_PORT / firewall): %s", exc)
            raise ServiceUnavailableError(
                "Could not connect to SMTP server. Check SMTP_HOST and SMTP_PORT.",
                error_code="email_connect_failed",
            ) from exc

        except aiosmtplib.SMTPException as exc:
            logger.error("SMTP error during send: %s", exc)
            raise ServiceUnavailableError(
                "Failed to send email via SMTP.", error_code="email_send_failed"
            ) from exc

        except OSError as exc:
            logger.error("Network error sending email: %s", exc)
            raise ServiceUnavailableError(
                "Network error while sending email.", error_code="email_network_error"
            ) from exc
