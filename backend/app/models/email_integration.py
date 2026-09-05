"""
EmailIntegration ORM model.

Stores per-user OAuth 2.0 credentials for email providers (primarily Gmail).
Tokens are encrypted at rest using Fernet symmetric encryption keyed from SECRET_KEY.
Tokens are NEVER returned over API responses.
Strictly user-specific and idempotent via unique constraint on (user_id, provider).
"""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class IntegrationStatus(str, enum.Enum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"
    ERROR = "ERROR"


class EmailProviderType(str, enum.Enum):
    GMAIL = "GMAIL"
    OUTLOOK = "OUTLOOK"


class EmailIntegration(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "email_integrations"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_email_provider"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    provider: Mapped[EmailProviderType] = mapped_column(
        Enum(
            EmailProviderType,
            name="emailprovidertype",
            native_enum=True,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=False,
        default=EmailProviderType.GMAIL,
        server_default="GMAIL",
        index=True,
    )

    provider_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # Tokens encrypted at rest using Fernet (URL-safe base64 string)
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)

    token_expiry: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    scopes: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    status: Mapped[IntegrationStatus] = mapped_column(
        Enum(
            IntegrationStatus,
            name="integrationstatus",
            native_enum=True,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=False,
        default=IntegrationStatus.CONNECTED,
        server_default="CONNECTED",
        index=True,
    )

    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Extra provider-specific metadata (history ID, profile info)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True, default=dict
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    @property
    def is_connected(self) -> bool:
        return self.status == IntegrationStatus.CONNECTED

    def __repr__(self) -> str:
        return (
            f"<EmailIntegration id={self.id} user_id={self.user_id} "
            f"provider={self.provider.value} email={self.provider_email!r} status={self.status.value}>"
        )
