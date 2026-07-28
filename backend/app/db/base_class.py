"""
Declarative base for all ORM models, using SQLAlchemy 2.0's typed
`DeclarativeBase` style (as opposed to the legacy `declarative_base()`
factory function).

A `naming_convention` is set on the metadata so that every constraint
(index, foreign key, unique, check, primary key) gets a deterministic,
human-readable name. Without this, Postgres/SQLAlchemy auto-generates
opaque names that differ across environments and make Alembic
autogenerate output noisy and Alembic downgrades error-prone.
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base class every ORM model inherits from."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
