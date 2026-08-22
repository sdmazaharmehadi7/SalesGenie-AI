"""
Contact ORM model (CRM — Contacts module).

Maps to individual people (decision-makers, champions, influencers) linked
to an Account. A Contact may also be traced back to the originating Lead
via the optional lead_id FK.
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Contact(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "contacts"

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(150), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
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

    account: Mapped["Account | None"] = relationship("Account", back_populates="contacts")  # noqa: F821
    lead: Mapped["Lead | None"] = relationship("Lead", back_populates="contacts", foreign_keys=[lead_id])  # noqa: F821
    owner: Mapped["User | None"] = relationship("User", foreign_keys=[owner_id], lazy="joined")  # noqa: F821
    workspace: Mapped["Workspace | None"] = relationship("Workspace", foreign_keys=[workspace_id])  # noqa: F821
    opportunities: Mapped[list["Opportunity"]] = relationship(  # noqa: F821
        "Opportunity", back_populates="contact", foreign_keys="Opportunity.contact_id"
    )
    sales_interactions: Mapped[list["SalesInteraction"]] = relationship(  # noqa: F821
        "SalesInteraction",
        back_populates="contact",
        foreign_keys="SalesInteraction.contact_id",
    )
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        "Task", back_populates="contact", foreign_keys="Task.contact_id"
    )

    def __repr__(self) -> str:
        return f"<Contact id={self.id} name={self.first_name!r} {self.last_name!r}>"
