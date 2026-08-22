"""
Account ORM model (CRM — Accounts module).

Represents a company/organisation in the CRM, equivalent to a Salesforce Account.
Accounts are the top-level entity that Contacts, Opportunities, and Activities hang off.
"""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Account(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "accounts"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[str | None] = mapped_column(String(150), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    owner: Mapped["User | None"] = relationship("User", foreign_keys=[owner_id], lazy="joined")  # noqa: F821
    workspace: Mapped["Workspace | None"] = relationship("Workspace", foreign_keys=[workspace_id])  # noqa: F821
    contacts: Mapped[list["Contact"]] = relationship(  # noqa: F821
        "Contact", back_populates="account", cascade="all, delete-orphan"
    )
    leads: Mapped[list["Lead"]] = relationship(  # noqa: F821
        "Lead", back_populates="account", foreign_keys="Lead.account_id"
    )
    opportunities: Mapped[list["Opportunity"]] = relationship(  # noqa: F821
        "Opportunity", back_populates="account", cascade="all, delete-orphan"
    )
    sales_interactions: Mapped[list["SalesInteraction"]] = relationship(  # noqa: F821
        "SalesInteraction",
        back_populates="account",
        foreign_keys="SalesInteraction.account_id",
    )
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        "Task", back_populates="account", foreign_keys="Task.account_id"
    )

    def __repr__(self) -> str:
        return f"<Account id={self.id} name={self.name!r}>"
