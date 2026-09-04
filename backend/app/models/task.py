"""
Task ORM model (CRM — Tasks module).

Represents a sales action item assignable to a user, optionally linked to
any combination of Lead, Contact, Account, or Opportunity. Mirrors the
Salesforce Task object.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.pipeline_enums import TaskPriority

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.contact import Contact
    from app.models.lead import Lead
    from app.models.opportunity import Opportunity
    from app.models.user import User
    from app.models.workspace import Workspace


class Task(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "tasks"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    task_type: Mapped[str] = mapped_column(String(50), nullable=False, default="task", server_default="task", index=True)
    rescheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    priority: Mapped[TaskPriority] = mapped_column(
        Enum(
            TaskPriority,
            name="taskpriority",
            native_enum=True,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=False,
        default=TaskPriority.MEDIUM,
        server_default=TaskPriority.MEDIUM.value,
        index=True,
    )

    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    opportunity_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_to], lazy="joined")  # noqa: F821
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by])  # noqa: F821
    workspace: Mapped["Workspace | None"] = relationship("Workspace", foreign_keys=[workspace_id])  # noqa: F821
    lead: Mapped["Lead | None"] = relationship("Lead", back_populates="tasks", foreign_keys=[lead_id])  # noqa: F821
    contact: Mapped["Contact | None"] = relationship("Contact", back_populates="tasks", foreign_keys=[contact_id])  # noqa: F821
    account: Mapped["Account | None"] = relationship("Account", back_populates="tasks", foreign_keys=[account_id])  # noqa: F821
    opportunity: Mapped["Opportunity | None"] = relationship("Opportunity", back_populates="tasks", foreign_keys=[opportunity_id])  # noqa: F821

    @property
    def dynamic_status(self) -> str:
        return compute_follow_up_status(self.due_date, self.is_completed, self.rescheduled_at)

    def __repr__(self) -> str:
        return f"<Task id={self.id} title={self.title!r} priority={self.priority.value}>"


def compute_follow_up_status(
    due_date: datetime | None,
    is_completed: bool,
    rescheduled_at: datetime | None = None,
    now: datetime | None = None,
) -> str:
    """
    Computes follow-up status consistently across backend and schemas.
    - COMPLETED if is_completed is True
    - OVERDUE if due_date is in the past (before today, or before now)
    - DUE if due today
    - RESCHEDULED if rescheduled and scheduled for a future date
    - UPCOMING if future date
    """
    from datetime import timezone

    if is_completed:
        return "COMPLETED"
    if due_date is None:
        return "UPCOMING"

    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    due = due_date if due_date.tzinfo is not None else due_date.replace(tzinfo=timezone.utc)

    if due < now:
        if due.date() < now.date():
            return "OVERDUE"
        return "DUE"
    elif due.date() == now.date():
        return "DUE"
    else:
        if rescheduled_at is not None:
            return "RESCHEDULED"
        return "UPCOMING"

