"""
Reusable SQLAlchemy 2.0 mixins.

Every concrete model inherits from `Base` (declarative base) plus one of
these mixins, so that primary-key and timestamp columns — and their
behavior — are defined in exactly one place.

Two timestamp mixins are provided:

- `TimestampMixin` (`created_at` + `updated_at`, auto-managed by the DB):
  for mutable entities whose state changes over time (e.g. `Leads`,
  `Users`, `Outreach_Campaigns` — a lead's status or a campaign's status
  changes after creation, so `updated_at` is meaningful).
- A single `generated_at_column()` factory for append-only, snapshot-style
  records that are written once and never updated (e.g. AI-generated
  `Company_Insights`, `Lead_Scores`, `Sales_Analytics` snapshots,
  `Sales_Interactions` logs, `CRM_Sync_Logs` entries) — matching the
  single-timestamp columns shown for these tables in the ER diagram.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKeyMixin:
    """Adds a UUID primary key, generated client-side by default."""

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )


class TimestampMixin:
    """Adds `created_at` / `updated_at` columns, both managed by the DB itself."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def generated_at_column():
    """
    Factory for a single DB-managed timestamp column, used by append-only
    models under whatever column name matches the ER diagram (e.g.
    `generated_at`, `interaction_date`, `timestamp`). Not a mixin itself
    (mixins can't easily rename a column per-subclass), so each model
    assigns this to its own attribute name:

        generated_at: Mapped[datetime] = generated_at_column()
    """
    return mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
