"""
Authentication endpoints.

Route handlers stay thin: parse/validate the request (via Pydantic
schemas), delegate to `AuthService`, and map the result (or a raised
`AppException`) onto an HTTP response. All actual auth logic lives in
`app.services.auth_service`.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentActiveUser, DBSession
from app.schemas.user import Token, TokenRefreshRequest, UserCreate, UserRead
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=Token,
    status_code=201,
    summary="Register a new user",
)
async def register(user_in: UserCreate, db: DBSession) -> Token:
    _, token = await AuthService(db).register(user_in)
    return token


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
    # treat it as the user's email, which is what Swagger UI's built-in
    # "Authorize" login form will submit.
    return await AuthService(db).login(email=form_data.username, password=form_data.password)


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
