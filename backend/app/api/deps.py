"""
Shared FastAPI dependencies, injected into route handlers via `Depends(...)`.

- Database session + pagination: Module 1.
- Current-user / RBAC dependencies: Module 2. Every route that needs to
  know "who is calling this?" or "is this caller allowed to do this?"
  depends on `CurrentUser` / `CurrentActiveUser` / `require_roles(...)`
  from this one file, so auth logic is never duplicated per-endpoint.
- Integration provider dependencies (AI / email / calendar): exposed as
  FastAPI dependencies, rather than services importing the factories
  directly, so tests can override them via `app.dependency_overrides`
  without needing to patch module-level singletons.
"""

import uuid
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import TokenType, decode_token
from app.db.session import get_session
from app.integrations.ai.base import AIProvider
from app.integrations.ai.factory import get_ai_provider
from app.integrations.calendar.base import CalendarProvider
from app.integrations.calendar.factory import get_calendar_provider
from app.integrations.email.base import EmailProvider
from app.integrations.email.factory import get_email_provider
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository


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


# ---------------------------------------------------------------------------
# Authentication / Authorization
# ---------------------------------------------------------------------------

# `tokenUrl` only affects the OpenAPI docs' "Authorize" button — it points
# Swagger UI at the login endpoint so the login form appears automatically.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=True)


async def get_current_user(
    db: DBSession,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    """
    Decode the bearer token from the `Authorization` header and load the
    corresponding user. Raises 401 for any failure mode (expired token,
    bad signature, wrong token type, deleted user) — deliberately without
    distinguishing *why* in the response body, to avoid giving an attacker
    a signal about which part of their forged token was wrong.
    """
    try:
        payload = decode_token(token)
    except JWTError:
        raise UnauthorizedError("Could not validate credentials.", error_code="invalid_token")

    if payload.get("type") != TokenType.ACCESS.value:
        raise UnauthorizedError("Could not validate credentials.", error_code="invalid_token")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise UnauthorizedError("Could not validate credentials.", error_code="invalid_token")

    user = await UserRepository(db).get_by_id(user_id)
    if user is None:
        raise UnauthorizedError("Could not validate credentials.", error_code="invalid_token")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_active_user(current_user: CurrentUser) -> User:
    """Same as `get_current_user`, but also rejects deactivated accounts."""
    if not current_user.is_active:
        raise ForbiddenError("This account has been deactivated.", error_code="account_inactive")
    return current_user


CurrentActiveUser = Annotated[User, Depends(get_current_active_user)]


def require_roles(*allowed_roles: UserRole):
    """
    Dependency factory for role-gated endpoints, e.g.:

        @router.delete("/leads/{lead_id}")
        async def delete_lead(
            user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.SALES_MANAGER))],
        ): ...
    """

    async def _check_role(current_user: CurrentActiveUser) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenError(
                "You do not have permission to perform this action.",
                error_code="insufficient_role",
            )
        return current_user

    return _check_role


# ---------------------------------------------------------------------------
# Integration providers (AI, email, calendar)
# ---------------------------------------------------------------------------


def get_ai_provider_dep() -> AIProvider:
    return get_ai_provider()


def get_email_provider_dep() -> EmailProvider:
    return get_email_provider()


def get_calendar_provider_dep() -> CalendarProvider:
    return get_calendar_provider()


AIProviderDep = Annotated[AIProvider, Depends(get_ai_provider_dep)]
EmailProviderDep = Annotated[EmailProvider, Depends(get_email_provider_dep)]
CalendarProviderDep = Annotated[CalendarProvider, Depends(get_calendar_provider_dep)]
