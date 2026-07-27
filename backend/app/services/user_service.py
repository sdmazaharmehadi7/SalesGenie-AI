"""
User management service.

Distinct from `AuthService` (registration/login/tokens — self-service):
this service is for administrators managing *other* users' accounts
(changing role, department, or deactivating an account). Endpoints that
use it are gated with `require_roles(UserRole.ADMIN)` at the router
level; this service does not re-check roles itself, matching the same
division of responsibility used by `LeadService` (access control at the
boundary between HTTP and business logic).
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserUpdate


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserRepository(db)

    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found.", error_code="user_not_found")
        return user

    async def list_users(self, offset: int, limit: int) -> list[User]:
        return await self.users.list_all(offset=offset, limit=limit)

    async def update_user(self, user_id: uuid.UUID, user_in: UserUpdate) -> User:
        user = await self.get_user(user_id)
        updated = await self.users.update(user, user_in)
        await self.db.commit()
        return updated
