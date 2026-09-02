"""
User repository — the only place in the codebase that issues SQLAlchemy
queries against the `users` table. Services call into this layer instead
of building queries themselves, so persistence details (query shape,
eager-loading, etc.) can change without touching business logic.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def create(self, user_in: UserCreate, hashed_password: str) -> User:
        user = User(
            name=user_in.name,
            email=user_in.email.lower(),
            hashed_password=hashed_password,
            role=user_in.role,
            department=user_in.department,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update(self, user: User, user_in: UserUpdate) -> User:
        update_data = user_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def list_all(self, offset: int = 0, limit: int = 20) -> list[User]:
        result = await self.db.execute(select(User).offset(offset).limit(limit))
        return list(result.scalars().all())

    async def search_by_email(self, query: str, limit: int = 10) -> list[User]:
        clean_query = query.strip().lower()
        if not clean_query:
            return []
        stmt = (
            select(User)
            .where(
                User.is_active == True,  # noqa: E712
                User.email.ilike(f"%{clean_query}%"),
            )
            .order_by(User.email.asc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
