"""
Opportunity ORM model (CRM — Opportunities / Deals module).

Represents a sales deal in the pipeline. Equivalent to a Salesforce Opportunity.
Each Opportunity tracks the deal amount, pipeline stage, close probability,
and expected close date. Stage changes automatically log an activity via the service layer.
"""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.pipeline_enums import OpportunityStage


class Opportunity(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "opportunities"
    __table_args__ = (
        CheckConstraint("probability >= 0 AND probability <= 100", name="ck_opportunities_probability_range"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    probability: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_closed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_won: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    stage: Mapped[OpportunityStage] = mapped_column(
        Enum(
            OpportunityStage,
            name="opportunitystage",
            native_enum=True,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=False,
        default=OpportunityStage.NEW,
        server_default=OpportunityStage.NEW.value,
        index=True,
    )

    account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="SET NULL"),
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

    account: Mapped["Account | None"] = relationship("Account", back_populates="opportunities")  # noqa: F821
    contact: Mapped["Contact | None"] = relationship("Contact", back_populates="opportunities", foreign_keys=[contact_id])  # noqa: F821
    lead: Mapped["Lead | None"] = relationship("Lead", back_populates="opportunities", foreign_keys=[lead_id])  # noqa: F821
    owner: Mapped["User | None"] = relationship("User", foreign_keys=[owner_id], lazy="joined")  # noqa: F821
    workspace: Mapped["Workspace | None"] = relationship("Workspace", foreign_keys=[workspace_id])  # noqa: F821
    sales_interactions: Mapped[list["SalesInteraction"]] = relationship(  # noqa: F821
        "SalesInteraction",
        back_populates="opportunity",
        foreign_keys="SalesInteraction.opportunity_id",
    )
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        "Task", back_populates="opportunity", foreign_keys="Task.opportunity_id"
    )

    def __repr__(self) -> str:
        return f"<Opportunity id={self.id} name={self.name!r} stage={self.stage.value}>"
