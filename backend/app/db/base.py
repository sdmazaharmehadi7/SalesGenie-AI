"""
This module exists purely so that Alembic (`alembic/env.py`) has a single,
stable place to import `Base` from, with the guarantee that every model
has already been imported (and therefore registered on `Base.metadata`)
by the time `target_metadata` is read.

Do not import `Base` directly from `app.db.base_class` anywhere except
here and inside `app/models/__init__.py` — import it from `app.models`
(or, for Alembic, from here) instead.
"""

from app.models import Base  # noqa: F401

# Re-export every model so `Base.metadata.tables` is complete. As feature
# modules are added, model imports go in `app/models/__init__.py` — this
# file does not need further edits.
