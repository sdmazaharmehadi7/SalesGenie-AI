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
"""

import uuid
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import UUIDPrimaryKeyMixin, generated_at_column
from app.models.pipeline_enums import InteractionType


class SalesInteraction(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "sales_interactions"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
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

    lead: Mapped["Lead"] = relationship("Lead", back_populates="sales_interactions")  # noqa: F821

    def __repr__(self) -> str:
        return f"<SalesInteraction id={self.id} lead_id={self.lead_id} type={self.interaction_type.value}>"
