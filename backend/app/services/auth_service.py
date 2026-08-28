"""
Authentication service — business logic for registration, login, OTP email verification,
and token refresh. Route handlers in `app/api/v1/endpoints/auth.py` stay thin
and only translate HTTP <-> service calls; all auth logic lives here.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    ServiceUnavailableError,
    UnauthorizedError,
    ValidationAppError,
)
from app.core.logging import get_logger
from app.core.security import (
    TokenType,
    create_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.integrations.email.factory import get_email_provider
from app.models.email_otp import EmailOTP
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    ChangePasswordRequest,
    GoogleAuthRequest,
    SignupResponse,
    Token,
    UserCreate,
)

logger = get_logger(__name__)


def _generate_otp_code() -> str:
    """Generate a 6-digit cryptographically secure OTP code."""
    return str(secrets.randbelow(900000) + 100000)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserRepository(db)

    def _issue_tokens(self, user: User) -> Token:
        extra_claims = {"role": user.role.value, "email": user.email}
        access_token = create_token(str(user.id), TokenType.ACCESS, extra_claims=extra_claims)
        refresh_token = create_token(str(user.id), TokenType.REFRESH, extra_claims=extra_claims)
        return Token(access_token=access_token, refresh_token=refresh_token)

    async def _send_otp_email(self, email: str, otp_code: str, name: str | None = None) -> None:
        """Send verification email containing the 6-digit OTP code."""
        user_name = name or email.split("@")[0]
        subject = f"{otp_code} is your SalesGenie AI verification code"
        body = f"""Hello {user_name},

Thank you for registering with SalesGenie AI!

Your 6-digit email verification code is:

{otp_code}

This code is valid for 10 minutes and can only be used once. Please do not share this code with anyone.

If you did not attempt to sign up for an account, you can safely ignore this email.

Best regards,
SalesGenie AI Team
"""
        try:
            email_provider = get_email_provider()
            await email_provider.send_email(
                to_address=email,
                subject=subject,
                body=body,
            )
            logger.info("Verification OTP successfully sent to %s", email)
        except ServiceUnavailableError:
            # Already logged with specifics inside SMTPEmailClient — re-raise to surface the error
            raise
        except Exception as exc:
            logger.error("Unexpected error sending OTP email to %s: %s", email, exc)
            raise ServiceUnavailableError(
                "Failed to send verification email. Please try again.",
                error_code="email_send_failed",
            ) from exc

    async def register(self, user_in: UserCreate) -> tuple[User, SignupResponse]:
        """
        Register a new user with email and password.
        Creates the user with is_email_verified=False and sends a 6-digit OTP to their email.
        """
        clean_email = user_in.email.strip().lower()
        existing = await self.users.get_by_email(clean_email)

        now = datetime.now(timezone.utc)
        otp_code = _generate_otp_code()
        expires_at = now + timedelta(minutes=10)

        if existing is not None:
            if existing.is_email_verified:
                raise ConflictError(
                    "A user with this email already exists.",
                    error_code="email_already_registered",
                )
            # If account exists but was never verified, update details and re-issue OTP
            existing.name = user_in.name
            existing.hashed_password = hash_password(user_in.password)
            user = existing
        else:
            hashed = hash_password(user_in.password)
            user = await self.users.create(user_in, hashed_password=hashed)
            user.is_email_verified = False

        # Invalidate any previous unused OTPs for this user
        prev_otps_stmt = (
            select(EmailOTP)
            .where(EmailOTP.user_id == user.id, EmailOTP.is_used == False)
        )
        prev_result = await self.db.execute(prev_otps_stmt)
        for prev_otp in prev_result.scalars().all():
            prev_otp.is_used = True

        # Create new single-use OTP record
        email_otp = EmailOTP(
            user_id=user.id,
            email=clean_email,
            otp_code=otp_code,
            expires_at=expires_at,
            last_sent_at=now,
            is_used=False,
        )
        self.db.add(email_otp)
        await self.db.commit()

        # Send email OTP
        await self._send_otp_email(clean_email, otp_code, user.name)

        return user, SignupResponse(
            message="Verification OTP sent to your email.",
            email=clean_email,
            requires_verification=True,
        )

    async def verify_otp(self, email: str, otp_code: str) -> Token:
        """
        Verify the 6-digit OTP code for a user's email address.
        Marks is_email_verified=True and returns active session tokens.
        """
        clean_email = email.strip().lower()
        user = await self.users.get_by_email(clean_email)
        if user is None:
            raise NotFoundError(
                "No account found with this email address.",
                error_code="user_not_found",
            )

        now = datetime.now(timezone.utc)
        stmt = (
            select(EmailOTP)
            .where(EmailOTP.user_id == user.id, EmailOTP.is_used == False)
            .order_by(EmailOTP.created_at.desc())
        )
        result = await self.db.execute(stmt)
        otp_record = result.scalars().first()

        if otp_record is None:
            raise ValidationAppError(
                "No active verification code found. Please request a new code.",
                error_code="otp_not_found",
            )

        if otp_record.expires_at <= now:
            otp_record.is_used = True
            await self.db.commit()
            raise ValidationAppError(
                "Verification code has expired. Please request a new one.",
                error_code="otp_expired",
            )

        if otp_record.otp_code != otp_code.strip():
            raise ValidationAppError(
                "Incorrect 6-digit verification code. Please try again.",
                error_code="incorrect_otp",
            )

        # Mark OTP as used and user as verified
        otp_record.is_used = True
        user.is_email_verified = True
        await self.db.commit()

        logger.info("Email successfully verified for user %s (%s)", user.id, user.email)
        return self._issue_tokens(user)

    async def resend_otp(self, email: str) -> dict:
        """
        Resend a new 6-digit OTP to the user's email with a 60-second rate limit cooldown.
        """
        clean_email = email.strip().lower()
        user = await self.users.get_by_email(clean_email)
        if user is None:
            raise NotFoundError(
                "No account found with this email address.",
                error_code="user_not_found",
            )

        if user.is_email_verified:
            return {"message": "Email is already verified. Please sign in."}

        now = datetime.now(timezone.utc)

        # Check rate limit cooldown (60 seconds)
        stmt = (
            select(EmailOTP)
            .where(EmailOTP.user_id == user.id)
            .order_by(EmailOTP.created_at.desc())
        )
        result = await self.db.execute(stmt)
        latest_otp = result.scalars().first()

        if latest_otp and latest_otp.last_sent_at:
            elapsed = (now - latest_otp.last_sent_at).total_seconds()
            if elapsed < 60:
                remaining = int(60 - elapsed)
                raise ValidationAppError(
                    f"Please wait {remaining} seconds before requesting a new code.",
                    error_code="otp_cooldown",
                )

        # Invalidate previous unused OTPs
        prev_otps_stmt = (
            select(EmailOTP)
            .where(EmailOTP.user_id == user.id, EmailOTP.is_used == False)
        )
        prev_result = await self.db.execute(prev_otps_stmt)
        for prev_otp in prev_result.scalars().all():
            prev_otp.is_used = True

        # Generate and save new OTP
        otp_code = _generate_otp_code()
        expires_at = now + timedelta(minutes=10)

        email_otp = EmailOTP(
            user_id=user.id,
            email=clean_email,
            otp_code=otp_code,
            expires_at=expires_at,
            last_sent_at=now,
            is_used=False,
        )
        self.db.add(email_otp)
        await self.db.commit()

        # Send email OTP
        await self._send_otp_email(clean_email, otp_code, user.name)

        return {"message": "A new 6-digit verification code has been sent to your email."}

    async def authenticate(self, email: str, password: str) -> User:
        """Authenticate user credentials, verifying active status and email verification."""
        clean_email = email.strip().lower()
        user = await self.users.get_by_email(clean_email)
        if user is None or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Incorrect email or password.", error_code="invalid_credentials")
        if not user.is_active:
            raise UnauthorizedError("This account has been deactivated.", error_code="account_inactive")
        if not user.is_email_verified:
            raise UnauthorizedError(
                "Please verify your email address before signing in.",
                error_code="email_not_verified",
            )
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
        of the new password.
        """
        if not verify_password(payload.current_password, user.hashed_password):
            raise UnauthorizedError(
                "Current password is incorrect.",
                error_code="invalid_current_password",
            )
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

        user_id = payload.get("sub")
        if user_id is None:
            raise UnauthorizedError("Invalid token payload.", error_code="invalid_refresh_token")

        user = await self.users.get_by_id(uuid.UUID(user_id))
        if user is None or not user.is_active:
            raise UnauthorizedError("User account no longer active.", error_code="account_inactive")

        return self._issue_tokens(user)

    async def google_authenticate(self, payload: GoogleAuthRequest) -> Token:
        """
        Authenticate or register using Google OAuth 2.0 / OpenID Connect.
        Google accounts are automatically treated as email-verified (no OTP required).
        """
        id_token_str = payload.credential or payload.id_token

        # Handle authorization code exchange if code was provided
        if payload.code and not id_token_str:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://oauth2.googleapis.com/token",
                        data={
                            "code": payload.code,
                            "client_id": settings.GOOGLE_CLIENT_ID,
                            "client_secret": settings.GOOGLE_CLIENT_SECRET,
                            "redirect_uri": payload.redirect_uri or settings.GOOGLE_REDIRECT_URI,
                            "grant_type": "authorization_code",
                        },
                    )
                    if resp.status_code == 200:
                        token_json = resp.json()
                        id_token_str = token_json.get("id_token")
                    else:
                        logger.error("Google token exchange error: %s", resp.text)
                        raise UnauthorizedError(
                            "Failed to exchange Google authorization code.",
                            error_code="google_auth_failed",
                        )
            except httpx.RequestError as exc:
                logger.error("Google token request network failure: %s", exc)
                raise ServiceUnavailableError(
                    "Could not reach Google authentication service.",
                    error_code="google_auth_unavailable",
                ) from exc

        if not id_token_str:
            raise UnauthorizedError(
                "No Google credential or ID token provided.",
                error_code="missing_google_token",
            )

        # Verify Google ID token with Google's public certs
        try:
            req = google_requests.Request()
            audience = settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None
            id_info = google_id_token.verify_oauth2_token(id_token_str, req, audience)
        except ValueError as exc:
            logger.warning("Google ID token verification failed: %s", exc)
            raise UnauthorizedError(
                "Invalid or expired Google authentication token.",
                error_code="invalid_google_token",
            ) from exc
        except Exception as exc:
            logger.error("Error verifying Google ID token: %s", exc)
            raise ServiceUnavailableError(
                "Failed to verify Google token with Google servers.",
                error_code="google_auth_unavailable",
            ) from exc

        email = id_info.get("email")
        if not email:
            raise UnauthorizedError(
                "Google token does not contain a verified email address.",
                error_code="invalid_google_token",
            )
        email = email.strip().lower()

        # Check if email is verified by Google
        if not id_info.get("email_verified", True):
            raise UnauthorizedError(
                "Google email address is not verified.",
                error_code="unverified_google_email",
            )

        name = id_info.get("name") or id_info.get("given_name") or email.split("@")[0]

        # Check if user exists in PostgreSQL
        user = await self.users.get_by_email(email)
        if user is not None:
            if not user.is_active:
                raise UnauthorizedError("This account has been deactivated.", error_code="account_inactive")
            if not user.is_email_verified:
                user.is_email_verified = True
                await self.db.commit()
            logger.info("Google login successful for existing user %s (%s)", user.id, email)
            return self._issue_tokens(user)

        # Create new user for first-time Google sign-in
        random_pwd = f"GAuth_{secrets.token_urlsafe(24)}1A"
        hashed = hash_password(random_pwd)

        user_in = UserCreate(
            name=name[:150],
            email=email,
            password="GoogleAuthPlaceholder1",
            role=UserRole.SALES_REP,
        )

        new_user = await self.users.create(user_in, hashed_password=hashed)
        new_user.is_email_verified = True
        await self.db.commit()
        logger.info("Created new user via Google authentication: %s (%s)", new_user.id, email)

        return self._issue_tokens(new_user)
