import pytest
from app.db.session import engine


@pytest.fixture(autouse=True)
async def cleanup_db_engine():
    yield
    # Dispose connection pool so connections aren't tied to closed event loops
    await engine.dispose()
