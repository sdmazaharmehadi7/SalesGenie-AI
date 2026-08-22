"""
SalesInteraction ORM model.

Maps to the `Sales_Interactions` entity in the ER diagram (interaction_id,
lead_id, interaction_type, summary, action_items, interaction_date). Each
row is an immutable log entry (a call, meeting, or email touch and its
AI-generated summary) — append-only, so the diagram's own column name
`interaction_date` is used directly instead of `created_at`/`updated_at`.

`action_items` is stored as JSONB (a list of short strings/objects) rather
than a single text blob, since the Conversation Intelligence module needs
to render them as a checklist (see the "Action Items" panel in the
platform mockup), not just display prose.

CRM extension: `contact_id`, `account_id`, `opportunity_id` are all nullable
FK columns added to make this the universal activity timeline log for any
CRM entity. Existing rows that only reference `lead_id` are unaffected.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import UUIDPrimaryKeyMixin, generated_at_column
from app.models.pipeline_enums import InteractionType

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.contact import Contact
    from app.models.lead import Lead
    from app.models.opportunity import Opportunity
    from app.models.user import User
    from app.models.workspace import Workspace


class SalesInteraction(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "sales_interactions"

    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
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
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    interaction_type: Mapped[InteractionType] = mapped_column(
        Enum(
            InteractionType,
            name="interactiontype",
            native_enum=True,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=False,
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_items: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    interaction_date: Mapped[datetime] = generated_at_column()

    lead: Mapped["Lead | None"] = relationship("Lead", back_populates="sales_interactions", foreign_keys=[lead_id])  # noqa: F821
    contact: Mapped["Contact | None"] = relationship("Contact", back_populates="sales_interactions", foreign_keys=[contact_id])  # noqa: F821
    account: Mapped["Account | None"] = relationship("Account", back_populates="sales_interactions", foreign_keys=[account_id])  # noqa: F821
    opportunity: Mapped["Opportunity | None"] = relationship("Opportunity", back_populates="sales_interactions", foreign_keys=[opportunity_id])  # noqa: F821
    workspace: Mapped["Workspace | None"] = relationship("Workspace", foreign_keys=[workspace_id])  # noqa: F821
    user: Mapped["User | None"] = relationship("User", foreign_keys=[user_id])  # noqa: F821

    def __repr__(self) -> str:
        return f"<SalesInteraction id={self.id} type={self.interaction_type.value}>"
