"""
Model registration sanity checks.

These don't touch a real database — they only verify that every model is
importable, registered on `Base.metadata`, and that SQLAlchemy can
successfully resolve all `relationship(...)` string references (via
`configure_mappers()`). This is the fastest way to catch a typo in a
`back_populates` name or a forward-reference class name without needing a
live Postgres instance.
"""

from sqlalchemy.orm import configure_mappers

from app.models import Base

EXPECTED_TABLES = {
    "users",
    "leads",
    "company_insights",
    "lead_scores",
    "outreach_campaigns",
    "sales_interactions",
    "crm_sync_logs",
    "sales_analytics",
}


def test_all_tables_registered() -> None:
    assert EXPECTED_TABLES.issubset(set(Base.metadata.tables.keys()))


def test_mappers_configure_without_error() -> None:
    # Raises if any relationship() references an unresolvable class name
    # or mismatched back_populates pair.
    configure_mappers()
