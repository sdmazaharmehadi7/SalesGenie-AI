"""
Security primitives: password hashing and JWT encode/decode.

This module only provides low-level, reusable building blocks. The actual
`/auth/login`, `/auth/register` etc. endpoints (and the `get_current_user`
dependency that consumes `decode_token`) are implemented in the Users &
Auth module. Keeping these primitives here in `core` — rather than inside
that module — lets any future module (e.g. signed links, service-to-service
tokens) reuse them without a circular import back into `auth`.
"""

from datetime import datetime, timedelta, timezone
from enum import StrEnum
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plaintext password against a bcrypt hash."""
    return _pwd_context.verify(plain_password, hashed_password)


def create_token(
    subject: str,
    token_type: TokenType,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """
    Create a signed JWT.

    `subject` is typically the user's id (as a string). `extra_claims` lets
    callers embed non-sensitive data (e.g. role) to avoid a DB round trip
    on every request.
    """
    if expires_delta is None:
        expires_delta = (
            timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            if token_type == TokenType.ACCESS
            else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )

    now = datetime.now(timezone.utc)
    to_encode: dict[str, Any] = {
        "sub": subject,
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
    }
    if extra_claims:
        to_encode.update(extra_claims)

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT.

    Raises `jose.JWTError` (or a subclass) on any validation failure —
    expired, malformed, or bad signature. Callers (e.g. the `get_current_user`
    dependency added in the Auth module) are expected to catch `JWTError`
    and translate it into an HTTP 401.
    """
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise
