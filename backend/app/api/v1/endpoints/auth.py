"""
Authentication endpoints.

Route handlers stay thin: parse/validate the request (via Pydantic
schemas), delegate to `AuthService`, and map the result (or a raised
`AppException`) onto an HTTP response. All actual auth logic lives in
`app.services.auth_service`.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentActiveUser, DBSession
from app.core.config import settings
from app.schemas.user import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    GoogleAuthRequest,
    OTPResponse,
    ResendOTPRequest,
    SignupResponse,
    Token,
    TokenRefreshRequest,
    UserCreate,
    UserRead,
    VerifyOTPRequest,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user (sends email OTP for verification)",
)
async def register(user_in: UserCreate, db: DBSession) -> SignupResponse:
    _, signup_resp = await AuthService(db).register(user_in)
    return signup_resp


@router.post(
    "/verify-otp",
    response_model=Token,
    summary="Verify 6-digit email OTP and activate account",
)
async def verify_otp(payload: VerifyOTPRequest, db: DBSession) -> Token:
    return await AuthService(db).verify_otp(payload.email, payload.otp)


@router.post(
    "/resend-otp",
    response_model=OTPResponse,
    summary="Resend 6-digit email verification OTP with rate limiting cooldown",
)
async def resend_otp(payload: ResendOTPRequest, db: DBSession) -> OTPResponse:
    result = await AuthService(db).resend_otp(payload.email)
    return OTPResponse(message=result["message"])


@router.post(
    "/login",
    response_model=Token,
    summary="Log in with email/password, returns access + refresh tokens",
)
async def login(
    db: DBSession,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    # OAuth2PasswordRequestForm's field is named `username` by spec — we
    # treat it as the user's email.
    return await AuthService(db).login(email=form_data.username, password=form_data.password)


@router.post(
    "/google",
    response_model=Token,
    summary="Authenticate or register using Google OAuth / OpenID Connect (OTP bypassed)",
)
async def google_auth(
    payload: GoogleAuthRequest,
    db: DBSession,
) -> Token:
    """Verify Google token, log in existing user or create a new user account, return SalesGenie JWT tokens."""
    return await AuthService(db).google_authenticate(payload)


@router.get(
    "/google/config",
    summary="Get Google OAuth client configuration for frontend initialization",
)
async def get_google_config() -> dict[str, str | None]:
    return {
        "client_id": settings.GOOGLE_CLIENT_ID,
    }


@router.post(
    "/refresh",
    response_model=Token,
    summary="Exchange a refresh token for a new access + refresh token pair",
)
async def refresh(payload: TokenRefreshRequest, db: DBSession) -> Token:
    return await AuthService(db).refresh_access_token(payload.refresh_token)


@router.get(
    "/me",
    response_model=UserRead,
    summary="Return the currently authenticated user",
)
async def read_current_user(current_user: CurrentActiveUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.post(
    "/change-password",
    response_model=ChangePasswordResponse,
    summary="Change the authenticated user's password",
    description=(
        "Verifies the current password, then replaces it with a bcrypt hash of "
        "the new password. Requires a valid bearer token. Returns 401 if the "
        "current password is wrong and 422 if validation fails."
    ),
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentActiveUser,
    db: DBSession,
) -> ChangePasswordResponse:
    await AuthService(db).change_password(current_user, payload)
    return ChangePasswordResponse()
