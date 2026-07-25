"""
ORM models package.

IMPORTANT for Alembic autogenerate: every concrete model module added in
future feature modules (e.g. `user.py`, `lead.py`, `company_insight.py`)
MUST be imported here so that `Base.metadata` is fully populated before
`alembic revision --autogenerate` inspects it. Module 1 has no concrete
models yet — only the shared `Base` and mixins.
"""

from app.db.base_class import Base  # noqa: F401

# Future modules will add lines like:
# from app.models.user import User  # noqa: F401
# from app.models.lead import Lead  # noqa: F401

__all__ = ["Base"]
