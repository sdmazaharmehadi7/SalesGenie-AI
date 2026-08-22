"""
Lead ORM model.

Maps to the `Leads` entity in the ER diagram (lead_id, company_name,
industry, contact_name, email, phone, lead_status, created_at), plus
`owner_id` (the assigned sales rep) and `updated_at` — additions beyond
the diagram that are needed for real-world use (RBAC-scoped queries,
tracking when a lead's stage last changed) but keep every original
column intact.
"""

import uuid
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.pipeline_enums import LeadStatus


class Lead(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "leads"

    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[str | None] = mapped_column(String(150), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    lead_status: Mapped[LeadStatus] = mapped_column(
        # Enum(LeadStatus, name="leadstatus", native_enum=True),
        Enum(
            LeadStatus,
            name="leadstatus",
            native_enum=True,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=False,
        default=LeadStatus.NEW,
        server_default=LeadStatus.NEW.value,
        index=True,
    )

    # Addition beyond the ER diagram: estimated/actual deal value in USD.
    deal_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)

    # -----------------------------------------------------------------------
    # Ownership / assignment columns
    # -----------------------------------------------------------------------

    # Legacy V1 field — kept for backward compatibility.
    # New code should prefer `created_by` and `assigned_to`.
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Who originally created this lead.
    # Populated at creation time and never changed thereafter.
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Who the lead is currently assigned to (workspace member).
    # Managers can reassign; team members cannot change this to another user.
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # CRM extension: link lead to a verified Account record.
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Workspace extension: partitions data by workspace. NULL = Personal Area.
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # -----------------------------------------------------------------------
    # Relationships
    # -----------------------------------------------------------------------

    # Legacy owner relationship (maps to owner_id)
    owner: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[owner_id], lazy="joined"
    )
    # Creator: the user who originally created the lead
    creator: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[created_by]
    )
    # Assignee: the user the lead is currently assigned to
    assignee: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[assigned_to]
    )

    workspace: Mapped["Workspace | None"] = relationship(  # noqa: F821
        "Workspace", foreign_keys=[workspace_id]
    )
    account: Mapped["Account | None"] = relationship(  # noqa: F821
        "Account", back_populates="leads", foreign_keys=[account_id]
    )
    company_insights: Mapped[list["CompanyInsight"]] = relationship(  # noqa: F821
        back_populates="lead", cascade="all, delete-orphan"
    )
    lead_scores: Mapped[list["LeadScore"]] = relationship(  # noqa: F821
        back_populates="lead", cascade="all, delete-orphan"
    )
    outreach_campaigns: Mapped[list["OutreachCampaign"]] = relationship(  # noqa: F821
        back_populates="lead", cascade="all, delete-orphan"
    )
    sales_interactions: Mapped[list["SalesInteraction"]] = relationship(  # noqa: F821
        back_populates="lead", foreign_keys="SalesInteraction.lead_id"
    )
    crm_sync_logs: Mapped[list["CRMSyncLog"]] = relationship(  # noqa: F821
        back_populates="lead", cascade="all, delete-orphan"
    )
    contacts: Mapped[list["Contact"]] = relationship(  # noqa: F821
        "Contact", back_populates="lead", foreign_keys="Contact.lead_id"
    )
    opportunities: Mapped[list["Opportunity"]] = relationship(  # noqa: F821
        "Opportunity", back_populates="lead", foreign_keys="Opportunity.lead_id"
    )
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        "Task", back_populates="lead", foreign_keys="Task.lead_id"
    )

    def __repr__(self) -> str:
        return f"<Lead id={self.id} company={self.company_name!r} status={self.lead_status.value}>"
