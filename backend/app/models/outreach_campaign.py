"""
OutreachCampaign ORM model.

Maps to the `Outreach_Campaigns` entity in the ER diagram (campaign_id,
lead_id, email_subject, email_content, campaign_status, created_at).
Unlike the "generated snapshot" tables, a campaign's `campaign_status`
mutates after creation (draft -> sent -> opened -> replied), so this uses
the full `TimestampMixin` (`created_at` + `updated_at`) rather than a
single `generated_at` column.
"""

import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.pipeline_enums import CampaignStatus


class OutreachCampaign(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "outreach_campaigns"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email_subject: Mapped[str] = mapped_column(String(255), nullable=False)
    email_content: Mapped[str] = mapped_column(Text, nullable=False)
    campaign_status: Mapped[CampaignStatus] = mapped_column(
    Enum(
        CampaignStatus,
        name="campaignstatus",
        native_enum=True,
        values_callable=lambda enum: [e.value for e in enum],
    ),
    nullable=False,
    default=CampaignStatus.DRAFT,
    server_default=CampaignStatus.DRAFT.value,
    index=True,
)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="outreach_campaigns")  # noqa: F821

    def __repr__(self) -> str:
        return f"<OutreachCampaign id={self.id} lead_id={self.lead_id} status={self.campaign_status.value}>"
