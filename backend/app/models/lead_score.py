"""
LeadScore ORM model.

Maps to the `Lead_Scores` entity in the ER diagram (score_id, lead_id,
lead_score, conversion_probability, generated_at). Each row is a
point-in-time scoring snapshot produced by the Lead Scoring &
Recommendation Engine (Module 3+) — append-only, hence `generated_at`
rather than `created_at`/`updated_at`. A lead can accumulate many scoring
snapshots over time; the most recent one (by `generated_at`) is its
current score.
"""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import UUIDPrimaryKeyMixin, generated_at_column


class LeadScore(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "lead_scores"
    __table_args__ = (
        CheckConstraint("lead_score >= 0 AND lead_score <= 100", name="ck_lead_scores_lead_score_range"),
        CheckConstraint(
            "conversion_probability >= 0 AND conversion_probability <= 1",
            name="ck_lead_scores_conversion_probability_range",
        ),
    )

    lead_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # 0-100 qualification score, e.g. the "92" shown in the platform mockup.
    lead_score: Mapped[int] = mapped_column(Integer, nullable=False)
    # 0.0-1.0 probability, e.g. "78%" conversion probability shown in the mockup.
    conversion_probability: Mapped[float] = mapped_column(Float, nullable=False)
    generated_at: Mapped[datetime] = generated_at_column()

    lead: Mapped["Lead"] = relationship("Lead", back_populates="lead_scores")  # noqa: F821

    def __repr__(self) -> str:
        return f"<LeadScore id={self.id} lead_id={self.lead_id} score={self.lead_score}>"
