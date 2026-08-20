"""Pydantic v2 schemas for the User resource and authentication flows."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.user import UserRole
from app.schemas.common import ORMBaseModel


class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    role: UserRole = UserRole.SALES_REP
    department: str | None = Field(default=None, max_length=100)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        return v


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    department: str | None = Field(default=None, max_length=100)
    role: UserRole | None = None
    is_active: bool | None = None


class UserRead(ORMBaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    department: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleAuthRequest(BaseModel):
    """Payload for Google OAuth 2.0 / OpenID Connect login."""
    credential: str | None = Field(default=None, description="Google ID Token from Google Identity Services")
    id_token: str | None = Field(default=None, description="Google ID Token alias")
    code: str | None = Field(default=None, description="Google Authorization Code")
    redirect_uri: str | None = Field(default=None, description="Redirect URI used for authorization code")


class ChangePasswordRequest(BaseModel):
    """Payload for authenticated change-password flow."""
    current_password: str = Field(min_length=1, max_length=128, description="The user's current password")
    new_password: str = Field(min_length=8, max_length=128, description="The desired new password")
    confirm_password: str = Field(min_length=8, max_length=128, description="Must match new_password")

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("New password must contain at least one digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("New password must contain at least one letter.")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "ChangePasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirmation do not match.")
        return self

    @model_validator(mode="after")
    def new_differs_from_current(self) -> "ChangePasswordRequest":
        if self.current_password == self.new_password:
            raise ValueError("New password must be different from your current password.")
        return self


class ChangePasswordResponse(BaseModel):
    message: str = "Password changed successfully."

