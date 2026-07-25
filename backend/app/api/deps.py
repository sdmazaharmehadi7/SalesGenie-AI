"""
Shared FastAPI dependencies, injected into route handlers via `Depends(...)`.

Module 1 only defines the database session dependency and a small
pagination helper. `get_current_user` / `get_current_active_user` /
role-based guards are added in the Users & Auth module, and will live here
too, so every route handler continues to import dependencies from this one
place.
"""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a request-scoped async DB session."""
    async for session in get_session():
        yield session


DBSession = Annotated[AsyncSession, Depends(get_db)]


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def get_pagination_params(
    page: Annotated[int, Query(ge=1, description="1-indexed page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)


Pagination = Annotated[PaginationParams, Depends(get_pagination_params)]
