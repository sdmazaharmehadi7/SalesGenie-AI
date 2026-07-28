"""
User management endpoints (admin-only).

Distinct from `/auth/*` (self-service registration/login/me): these
endpoints let an administrator view and manage *other* users' accounts.
Every route here is gated with `require_roles(UserRole.ADMIN)`.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import DBSession, Pagination, require_roles
from app.models.user import User, UserRole
from app.schemas.user import UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter()

AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("", response_model=list[UserRead], summary="List all users (admin only)")
async def list_users(db: DBSession, admin: AdminUser, pagination: Pagination) -> list[UserRead]:
    users = await UserService(db).list_users(offset=pagination.offset, limit=pagination.page_size)
    return [UserRead.model_validate(user) for user in users]


@router.get("/{user_id}", response_model=UserRead, summary="Get a single user (admin only)")
async def get_user(user_id: uuid.UUID, db: DBSession, admin: AdminUser) -> UserRead:
    user = await UserService(db).get_user(user_id)
    return UserRead.model_validate(user)


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="Update a user's role, department, or active status (admin only)",
)
async def update_user(
    user_id: uuid.UUID, user_in: UserUpdate, db: DBSession, admin: AdminUser
) -> UserRead:
    user = await UserService(db).update_user(user_id, user_in)
    return UserRead.model_validate(user)
