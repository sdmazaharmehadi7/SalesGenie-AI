"""
SalesAnalytics ORM model.

Maps to the `Sales_Analytics` entity in the ER diagram (analytics_id,
user_id, conversion_rate, pipeline_value, generated_at). Each row is a
point-in-time analytics snapshot for one user (e.g. computed nightly, or
on-demand when the dashboard is viewed) — append-only, hence
`generated_at`. Keeping historical snapshots (rather than a single
mutable row per user) lets the dashboard show trend lines ("+3.2% from
last month") the way the mockup does.
"""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import UUIDPrimaryKeyMixin, generated_at_column


class SalesAnalytics(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "sales_analytics"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Percentage, e.g. 24.8 for "24.8%" shown in the dashboard mockup.
    conversion_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    # Dollar value, e.g. 2400000.00 for "$2.4M" shown in the dashboard mockup.
    pipeline_value: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    generated_at: Mapped[datetime] = generated_at_column()

    user: Mapped["User"] = relationship("User")  # noqa: F821

    def __repr__(self) -> str:
        return f"<SalesAnalytics id={self.id} user_id={self.user_id} conversion_rate={self.conversion_rate}>"
