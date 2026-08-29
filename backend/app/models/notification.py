"""
Notification and NotificationPreference ORM models.

Supports strict workspace and user-level data isolation:
- Each notification is owned by a specific `user_id`.
- If `workspace_id` is set, the notification belongs to that workspace context.
- If `workspace_id` is None, it belongs to the user's Personal Area.

Supported Notification Types:
- lead_assigned
- lead_status_changed
- email_opened
- email_replied
- meeting_reminder
- weekly_digest
- ai_insights
- team_mentions
"""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace


class NotificationType(str, enum.Enum):
    LEAD_ASSIGNED = "lead_assigned"
    LEAD_STATUS_CHANGED = "lead_status_changed"
    EMAIL_OPENED = "email_opened"
    EMAIL_REPLIED = "email_replied"
    MEETING_REMINDER = "meeting_reminder"
    WEEKLY_DIGEST = "weekly_digest"
    AI_INSIGHTS = "ai_insights"
    TEAM_MENTIONS = "team_mentions"


class Notification(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_read: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False, index=True
    )
    idempotency_key: Mapped[str | None] = mapped_column(
        String(255), nullable=True, unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    workspace: Mapped["Workspace | None"] = relationship("Workspace", foreign_keys=[workspace_id])

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user_id={self.user_id} type={self.type} is_read={self.is_read}>"


class NotificationPreference(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "notification_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # In-App preferences
    lead_assigned_inapp: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    lead_status_changed_inapp: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    email_opened_inapp: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    email_replied_inapp: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    meeting_reminder_inapp: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    weekly_digest_inapp: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    ai_insights_inapp: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    team_mentions_inapp: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

    # Email preference (strictly for Lead Assigned To Me)
    lead_assigned_email: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<NotificationPreference user_id={self.user_id}>"
