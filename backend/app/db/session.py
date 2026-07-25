"""
Database engine + session factory.

Uses SQLAlchemy 2.0's async engine (`asyncpg` driver) so that FastAPI's
async route handlers never block the event loop on database I/O. A single
module-level engine is created at import time and reused for the life of
the process; sessions are cheap, short-lived, and created per-request via
the `get_db` dependency in `app/api/deps.py`.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# The sync-style DSN assembled in config.py uses `postgresql+psycopg://`
# (used by Alembic, which runs synchronously). For the application's own
# async engine we swap in the asyncpg driver.
ASYNC_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URI.replace(
    "postgresql+psycopg://", "postgresql+asyncpg://"
)

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=True,  # detects stale connections (e.g. after DB restart)
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield a database session for the duration of a single request.

    Rolls back on any exception so a failed request never leaves a
    half-committed transaction; always closes the session afterward to
    return the connection to the pool.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connection() -> bool:
    """Used by the `/health/db` endpoint to verify DB connectivity."""
    from sqlalchemy import text

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
