"""
Authentication service — business logic for registration, login, and
token refresh. Route handlers in `app/api/v1/endpoints/auth.py` stay thin
and only translate HTTP <-> service calls; all the "what does it mean to
log in" logic lives here so it's reusable (e.g. by a future CLI or admin
tool) and independently testable.
"""

import secrets
import uuid

import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictError, ServiceUnavailableError, UnauthorizedError, ValidationAppError
from app.core.logging import get_logger
from app.core.security import TokenType, create_token, decode_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.user import ChangePasswordRequest, GoogleAuthRequest, Token, UserCreate

logger = get_logger(__name__)


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

    async def change_password(
        self,
        user: User,
        payload: ChangePasswordRequest,
    ) -> None:
        """
        Verify the user's current password, then replace it with a bcrypt hash
        of the new password. Never stores plaintext; rejects incorrect current
        passwords and same-as-current new passwords at the service layer.
        """
        if not verify_password(payload.current_password, user.hashed_password):
            raise UnauthorizedError(
                "Current password is incorrect.",
                error_code="invalid_current_password",
            )
        # Guard: new password must differ from current (also enforced in schema)
        if verify_password(payload.new_password, user.hashed_password):
            raise ValidationAppError(
                "New password must be different from your current password.",
                error_code="same_password",
            )
        user.hashed_password = hash_password(payload.new_password)
        await self.db.commit()
        logger.info("Password changed for user %s", user.id)


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

    async def google_authenticate(self, payload: GoogleAuthRequest) -> Token:
        """
        Authenticate a user via Google OAuth 2.0 / OpenID Connect.

        Accepts either an ID token (from Google Identity Services credential response)
        or an authorization code (from server redirect flow).
        Verifies the token with Google's public certificates, extracts the verified
        email and name, and either logs in the existing user or creates a new user account.
        """
        id_token_str = payload.credential or payload.id_token

        # If an OAuth authorization code was provided instead of an ID token, exchange it
        if not id_token_str and payload.code:
            if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
                raise ServiceUnavailableError(
                    "Google OAuth is not fully configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET).",
                    error_code="google_auth_not_configured",
                )
            redirect_uri = payload.redirect_uri or settings.GOOGLE_REDIRECT_URI or "http://localhost:5173/auth/google/callback"
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://oauth2.googleapis.com/token",
                        data={
                            "code": payload.code,
                            "client_id": settings.GOOGLE_CLIENT_ID,
                            "client_secret": settings.GOOGLE_CLIENT_SECRET,
                            "redirect_uri": redirect_uri,
                            "grant_type": "authorization_code",
                        },
                    )
                if resp.status_code != 200:
                    logger.warning("Google token exchange failed: %s %s", resp.status_code, resp.text)
                    raise UnauthorizedError("Failed to exchange Google authorization code.", error_code="invalid_google_code")
                token_data = resp.json()
                id_token_str = token_data.get("id_token")
            except httpx.RequestError as exc:
                logger.error("Network error during Google token exchange: %s", exc)
                raise ServiceUnavailableError("Could not reach Google authentication service.", error_code="google_auth_unavailable") from exc

        if not id_token_str:
            raise UnauthorizedError("No Google credential or ID token provided.", error_code="missing_google_token")

        # Verify Google ID token with Google's public certs
        try:
            req = google_requests.Request()
            audience = settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None
            id_info = google_id_token.verify_oauth2_token(id_token_str, req, audience)
        except ValueError as exc:
            logger.warning("Google ID token verification failed: %s", exc)
            raise UnauthorizedError("Invalid or expired Google authentication token.", error_code="invalid_google_token") from exc
        except Exception as exc:
            logger.error("Error verifying Google ID token: %s", exc)
            raise ServiceUnavailableError("Failed to verify Google token with Google servers.", error_code="google_auth_unavailable") from exc

        email = id_info.get("email")
        if not email:
            raise UnauthorizedError("Google token does not contain a verified email address.", error_code="invalid_google_token")
        email = email.strip().lower()

        # Check if email is verified by Google
        if not id_info.get("email_verified", True):
            raise UnauthorizedError("Google email address is not verified.", error_code="unverified_google_email")

        name = id_info.get("name") or id_info.get("given_name") or email.split("@")[0]

        # Check if user exists in PostgreSQL
        user = await self.users.get_by_email(email)
        if user is not None:
            if not user.is_active:
                raise UnauthorizedError("This account has been deactivated.", error_code="account_inactive")
            logger.info("Google login successful for existing user %s (%s)", user.id, email)
            return self._issue_tokens(user)

        # Create new user for first-time Google sign-in
        # Generate a cryptographically secure random password hash
        random_pwd = f"GAuth_{secrets.token_urlsafe(24)}1A"
        hashed = hash_password(random_pwd)

        user_in = UserCreate(
            name=name[:150],
            email=email,
            password="GoogleAuthPlaceholder1",  # dummy satisfying schema validator; actual stored hash is random_pwd
            role=UserRole.SALES_REP,
        )

        new_user = await self.users.create(user_in, hashed_password=hashed)
        await self.db.commit()
        logger.info("Created new user via Google authentication: %s (%s)", new_user.id, email)

        return self._issue_tokens(new_user)

