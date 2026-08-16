"""
Email configuration service.

Handles per-user SMTP credential storage and retrieval.
The App Password is encrypted at rest with Fernet symmetric encryption,
keyed from the application SECRET_KEY so each deployment has its own key.

Fernet produces URL-safe base64 tokens, which are stored as Text in PG.

IMPORTANT: The plain-text password is NEVER logged or returned in any
API response. Only `is_configured` and the username are surfaced to the UI.
"""

import base64
import uuid

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models.user_email_config import UserEmailConfig
from app.schemas.email_config import UserEmailConfigSave

logger = get_logger(__name__)


def _get_fernet() -> Fernet:
    """
    Derive a 32-byte Fernet key from SECRET_KEY.

    Fernet requires exactly 32 bytes (URL-safe base64-encoded to 44 chars).
    We take the first 32 bytes of the UTF-8-encoded SECRET_KEY and
    base64url-encode them to produce a valid Fernet key.
    """
    raw_key = settings.SECRET_KEY.encode("utf-8")[:32].ljust(32, b"\x00")
    fernet_key = base64.urlsafe_b64encode(raw_key)
    return Fernet(fernet_key)


def _encrypt_password(plaintext: str) -> str:
    """Encrypt a plain-text App Password. Returns a URL-safe base64 token."""
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def _decrypt_password(token: str) -> str:
    """Decrypt a stored Fernet token back to plain text."""
    return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")


class EmailConfigService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_config(self, user_id: uuid.UUID) -> UserEmailConfig:
        """
        Return the user's email config row, creating a default one if it
        doesn't exist yet.  The returned object has `is_configured=False`
        when no credentials have been saved.
        """
        result = await self.db.execute(
            select(UserEmailConfig).where(UserEmailConfig.user_id == user_id)
        )
        config = result.scalar_one_or_none()
        if config is None:
            config = UserEmailConfig(user_id=user_id)
            self.db.add(config)
            await self.db.commit()
            await self.db.refresh(config)
        return config

    async def save_config(
        self, user_id: uuid.UUID, data: UserEmailConfigSave
    ) -> UserEmailConfig:
        """
        Upsert the user's SMTP configuration.

        If `smtp_password` is omitted (None) in the payload, the existing
        encrypted password is left unchanged — so the frontend can update
        other fields without re-supplying the App Password.
        """
        config = await self.get_config(user_id)

        config.smtp_host = data.smtp_host
        config.smtp_port = data.smtp_port
        config.smtp_use_tls = data.smtp_use_tls
        config.smtp_username = data.smtp_username
        config.smtp_from_email = data.smtp_from_email
        config.smtp_from_name = data.smtp_from_name

        if data.smtp_password is not None:
            config.smtp_password_encrypted = _encrypt_password(data.smtp_password)
            logger.info("SMTP App Password updated for user %s (value never logged)", user_id)

        await self.db.commit()
        await self.db.refresh(config)
        return config

    def get_decrypted_password(self, config: UserEmailConfig) -> str | None:
        """
        Decrypt and return the stored App Password for actual SMTP use.
        Returns None if no password has been stored yet.
        """
        if not config.smtp_password_encrypted:
            return None
        try:
            return _decrypt_password(config.smtp_password_encrypted)
        except Exception:
            logger.error("Failed to decrypt SMTP password for user_id=%s", config.user_id)
            return None
