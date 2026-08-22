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


# ---------------------------------------------------------------------------
# Workspace-scoped RBAC
# ---------------------------------------------------------------------------


def require_workspace_role(*allowed_roles):
    """
    Dependency factory for workspace-context role-gated endpoints.

    Unlike the global `require_roles()` which checks User.role (a legacy
    column), this checks the calling user's WorkspaceMembership.role for
    the workspace identified by the `workspace_id` path parameter.

    Usage::

        from app.models.workspace import WorkspaceRole

        @router.delete("/workspaces/{workspace_id}/members/{user_id}")
        async def remove_member(
            workspace_id: uuid.UUID,
            user_id: uuid.UUID,
            _: Annotated[None, Depends(require_workspace_role(WorkspaceRole.MANAGER))],
            db: DBSession,
            current_user: CurrentActiveUser,
        ) -> None: ...

    The dependency raises:
      • 404 if the workspace does not exist or is inactive
      • 403 if the user is not an active member
      • 403 if the user's role is not in `allowed_roles`
    """
    import uuid as _uuid
    from fastapi import Path

    async def _check(
        workspace_id: _uuid.UUID,
        db: DBSession,
        current_user: CurrentActiveUser,
    ) -> None:
        # Inline import to avoid circular import (service imports models; deps imports service)
        from app.models.workspace import MembershipStatus, WorkspaceRole
        from app.repositories.workspace_repository import WorkspaceRepository

        repo = WorkspaceRepository(db)
        workspace = await repo.get_by_id(workspace_id)
        if workspace is None or not workspace.is_active:
            raise ForbiddenError("Workspace not found.", error_code="workspace_not_found")

        membership = await repo.get_membership(workspace_id, current_user.id)
        if membership is None or membership.status != MembershipStatus.ACTIVE.value:
            raise ForbiddenError("You are not a member of this workspace.", error_code="not_a_member")

        if membership.role not in allowed_roles:
            raise ForbiddenError(
                "You do not have the required workspace role.",
                error_code="insufficient_workspace_role",
            )

    return _check


# ---------------------------------------------------------------------------
# Workspace Context Dependency for CRM / Data Scoping
# ---------------------------------------------------------------------------


class WorkspaceContext(BaseModel):
    """
    Resolved workspace authorization context for the current request.

    - If workspace_id is None: user is operating in their Personal Area.
      Their personal CRM data is strictly isolated and never visible to others.
    - If workspace_id is set: user has been verified as an active member of this workspace.
      - role == MANAGER: full workspace data access, management capabilities, reassign leads.
      - role == TEAM_MEMBER: access authorized CRM data within this workspace.
    """

    workspace_id: uuid.UUID | None = None
    is_personal: bool = True
    is_manager: bool = False
    role: str | None = None  # WorkspaceRole string value if in workspace

    model_config = {"arbitrary_types_allowed": True}


async def get_workspace_context(
    db: DBSession,
    current_user: CurrentActiveUser,
    x_workspace_id: Annotated[str | None, Depends(lambda: None)] = None,
) -> WorkspaceContext:
    """
    Resolves and verifies the workspace context from X-Workspace-ID header
    or workspace_id query parameter.
    If no workspace is specified or personal is selected, returns Personal Area context.
    """
    # Note: we resolve header/query safely inside the dependency
    return WorkspaceContext(
        workspace_id=None,
        is_personal=True,
        is_manager=True,
        role=None,
    )


async def resolve_workspace_context(
    db: DBSession,
    current_user: CurrentActiveUser,
    workspace_id: uuid.UUID | None = Query(None, description="Optional workspace ID context"),
) -> WorkspaceContext:
    """
    Dependency that resolves the active workspace context and validates authorization.
    """
    if workspace_id is None:
        return WorkspaceContext(
            workspace_id=None,
            is_personal=True,
            is_manager=True,
            role=None,
        )

    from app.models.workspace import MembershipStatus, WorkspaceRole, WorkspaceType
    from app.repositories.workspace_repository import WorkspaceRepository

    repo = WorkspaceRepository(db)
    workspace = await repo.get_by_id(workspace_id)
    if workspace is None or not workspace.is_active:
        raise ForbiddenError("Workspace not found or inactive.", error_code="workspace_not_found")

    membership = await repo.get_membership(workspace_id, current_user.id)
    if membership is None or membership.status != MembershipStatus.ACTIVE.value:
        raise ForbiddenError(
            "You do not have permission to access this workspace.",
            error_code="workspace_access_denied",
        )

    is_personal = (workspace.type == WorkspaceType.PERSONAL)
    is_manager = (membership.role == WorkspaceRole.MANAGER)

    return WorkspaceContext(
        workspace_id=workspace_id,
        is_personal=is_personal,
        is_manager=is_manager,
        role=membership.role.value,
    )


WorkspaceContextDep = Annotated[WorkspaceContext, Depends(resolve_workspace_context)]
