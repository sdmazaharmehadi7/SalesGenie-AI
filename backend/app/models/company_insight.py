"""
CompanyInsight ORM model.

Maps to the `Company_Insights` entity in the ER diagram (insight_id,
lead_id, business_needs, opportunities, industry_analysis, generated_at).
Written once by the Lead Intelligence module (Module 3+) each time an AI
analysis is (re)generated for a lead — append-only, so it uses a single
`generated_at` timestamp rather than `created_at`/`updated_at`.
"""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import UUIDPrimaryKeyMixin, generated_at_column


class CompanyInsight(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "company_insights"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    business_needs: Mapped[str | None] = mapped_column(Text, nullable=True)
    opportunities: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = generated_at_column()

    lead: Mapped["Lead"] = relationship("Lead", back_populates="company_insights")  # noqa: F821

    def __repr__(self) -> str:
        return f"<CompanyInsight id={self.id} lead_id={self.lead_id}>"
