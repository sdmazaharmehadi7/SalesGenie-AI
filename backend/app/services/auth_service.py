"""
Authentication service — business logic for registration, login, and
token refresh. Route handlers in `app/api/v1/endpoints/auth.py` stay thin
and only translate HTTP <-> service calls; all the "what does it mean to
log in" logic lives here so it's reusable (e.g. by a future CLI or admin
tool) and independently testable.
"""

import uuid

from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import TokenType, create_token, decode_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import Token, UserCreate


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserRepository(db)

    def _issue_tokens(self, user: User) -> Token:
        extra_claims = {"role": user.role.value, "email": user.email}
        access_token = create_token(str(user.id), TokenType.ACCESS, extra_claims=extra_claims)
        refresh_token = create_token(str(user.id), TokenType.REFRESH, extra_claims=extra_claims)
        return Token(access_token=access_token, refresh_token=refresh_token)

    async def register(self, user_in: UserCreate) -> tuple[User, Token]:
        existing = await self.users.get_by_email(user_in.email)
        if existing is not None:
            raise ConflictError(
                "A user with this email already exists.", error_code="email_already_registered"
            )

        hashed = hash_password(user_in.password)
        user = await self.users.create(user_in, hashed_password=hashed)
        await self.db.commit()
        return user, self._issue_tokens(user)

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.users.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Incorrect email or password.", error_code="invalid_credentials")
        if not user.is_active:
            raise UnauthorizedError("This account has been deactivated.", error_code="account_inactive")
        return user

    async def login(self, email: str, password: str) -> Token:
        user = await self.authenticate(email, password)
        return self._issue_tokens(user)

    async def refresh_access_token(self, refresh_token: str) -> Token:
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise UnauthorizedError("Invalid or expired refresh token.", error_code="invalid_refresh_token")

        if payload.get("type") != TokenType.REFRESH.value:
            raise UnauthorizedError(
                "Provided token is not a refresh token.", error_code="invalid_refresh_token"
            )

        try:
            user_id = uuid.UUID(payload["sub"])
        except (KeyError, ValueError):
            raise UnauthorizedError("Malformed refresh token.", error_code="invalid_refresh_token")

        user = await self.users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise UnauthorizedError("User no longer exists or is inactive.", error_code="invalid_refresh_token")

        return self._issue_tokens(user)
