"""
UserEmailConfig ORM model.

Stores per-user Gmail / SMTP configuration so each sales rep can send
outreach emails from their own Gmail account.  The SMTP App Password is
stored encrypted (Fernet symmetric encryption keyed from SECRET_KEY) so
it is never stored in plain text in PostgreSQL.

One row per user (unique constraint on user_id).
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class UserEmailConfig(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "user_email_configs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # SMTP connection settings
    smtp_host: Mapped[str] = mapped_column(String(255), nullable=False, default="smtp.gmail.com", server_default="smtp.gmail.com")
    smtp_port: Mapped[int] = mapped_column(Integer, nullable=False, default=587, server_default="587")
    smtp_use_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    # Credentials — username is the Gmail address, password is stored encrypted
    smtp_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_password_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)  # Fernet token (URL-safe base64)

    # Display / From settings
    smtp_from_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_from_name: Mapped[str] = mapped_column(String(150), nullable=False, default="SalesGenie", server_default="SalesGenie")

    # Convenience back-reference
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])  # noqa: F821

    @property
    def is_configured(self) -> bool:
        """True if the user has supplied at minimum a username and password."""
        return bool(self.smtp_username and self.smtp_password_encrypted)

    def __repr__(self) -> str:
        return f"<UserEmailConfig user_id={self.user_id} username={self.smtp_username!r} configured={self.is_configured}>"
