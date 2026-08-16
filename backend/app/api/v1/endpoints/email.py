"""
Email configuration and sending endpoints.

GET  /email/config   — return current user's SMTP settings (password masked)
PUT  /email/config   — save / update SMTP settings (encrypts password at rest)
POST /email/test     — send a real test email using stored config
"""

import aiosmtplib
from email.message import EmailMessage

from fastapi import APIRouter, status

from app.api.deps import CurrentActiveUser, DBSession
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import get_logger
from app.schemas.email_config import EmailTestRequest, EmailTestResult, UserEmailConfigRead, UserEmailConfigSave
from app.services.email_config_service import EmailConfigService

router = APIRouter()
logger = get_logger(__name__)


@router.get(
    "/config",
    response_model=UserEmailConfigRead,
    summary="Get current user's email (SMTP) configuration",
)
async def get_email_config(
    db: DBSession,
    current_user: CurrentActiveUser,
) -> UserEmailConfigRead:
    """Return the authenticated user's SMTP config. Password is never returned."""
    svc = EmailConfigService(db)
    config = await svc.get_config(current_user.id)
    return UserEmailConfigRead(
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        smtp_use_tls=config.smtp_use_tls,
        smtp_username=config.smtp_username,
        smtp_from_email=config.smtp_from_email,
        smtp_from_name=config.smtp_from_name,
        is_configured=config.is_configured,
    )


@router.put(
    "/config",
    response_model=UserEmailConfigRead,
    summary="Save / update SMTP email configuration for current user",
)
async def save_email_config(
    config_in: UserEmailConfigSave,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> UserEmailConfigRead:
    """
    Upsert the user's Gmail SMTP settings.
    If `smtp_password` is omitted, the existing stored App Password is preserved.
    """
    svc = EmailConfigService(db)
    config = await svc.save_config(current_user.id, config_in)
    return UserEmailConfigRead(
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        smtp_use_tls=config.smtp_use_tls,
        smtp_username=config.smtp_username,
        smtp_from_email=config.smtp_from_email,
        smtp_from_name=config.smtp_from_name,
        is_configured=config.is_configured,
    )


@router.post(
    "/test",
    response_model=EmailTestResult,
    summary="Send a test email using the user's stored SMTP configuration",
)
async def test_email(
    body: EmailTestRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> EmailTestResult:
    """
    Attempt to send a plain-text test email via the user's saved Gmail SMTP config.
    Returns `success=True` on delivery, or `success=False` with an error message.
    """
    svc = EmailConfigService(db)
    config = await svc.get_config(current_user.id)

    if not config.is_configured:
        return EmailTestResult(
            success=False,
            message="No SMTP configuration found. Please save your Gmail settings first.",
        )

    password = svc.get_decrypted_password(config)
    if not password:
        return EmailTestResult(
            success=False,
            message="Could not retrieve stored App Password. Please re-save your configuration.",
        )

    to_address = body.to_address or config.smtp_username
    if not to_address:
        return EmailTestResult(
            success=False,
            message="No recipient address. Set a 'to_address' or ensure smtp_username is saved.",
        )

    from_display = f"{config.smtp_from_name} <{config.smtp_from_email or config.smtp_username}>"

    msg = EmailMessage()
    msg["From"] = from_display
    msg["To"] = to_address
    msg["Subject"] = "✅ SalesGenie Email Test — Configuration Working"
    msg.set_content(
        f"Hello,\n\n"
        f"This is a test email sent from SalesGenie AI to verify your Gmail SMTP configuration.\n\n"
        f"Sent by: {current_user.name or current_user.email}\n"
        f"SMTP server: {config.smtp_host}:{config.smtp_port}\n"
        f"From: {config.smtp_username}\n\n"
        f"If you received this message, your email integration is working correctly!\n\n"
        f"— SalesGenie AI"
    )

    try:
        await aiosmtplib.send(
            msg,
            hostname=config.smtp_host,
            port=config.smtp_port,
            username=config.smtp_username,
            password=password,
            start_tls=config.smtp_use_tls,
            timeout=20,
        )
        logger.info(
            "Test email sent successfully",
            extra={"user_id": str(current_user.id), "to": to_address},
        )
        return EmailTestResult(
            success=True,
            message=f"Test email sent successfully to {to_address}. Check your inbox!",
        )
    except aiosmtplib.SMTPAuthenticationError:
        return EmailTestResult(
            success=False,
            message=(
                "Authentication failed. Make sure you are using a Gmail App Password "
                "(not your regular password). Generate one at: "
                "https://myaccount.google.com/apppasswords"
            ),
        )
    except aiosmtplib.SMTPConnectError as exc:
        return EmailTestResult(
            success=False,
            message=f"Could not connect to {config.smtp_host}:{config.smtp_port}. "
                    f"Check your SMTP host and port. Detail: {exc}",
        )
    except (aiosmtplib.SMTPException, OSError) as exc:
        logger.warning("SMTP test failed for user %s: %s", current_user.id, exc)
        return EmailTestResult(
            success=False,
            message=f"SMTP error: {exc}",
        )
