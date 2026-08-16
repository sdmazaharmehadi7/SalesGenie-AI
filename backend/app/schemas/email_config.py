"""Pydantic v2 schemas for user SMTP email configuration and email sending."""

from pydantic import BaseModel, EmailStr, Field


class UserEmailConfigRead(BaseModel):
    """Returned by GET /email/config — password is always masked."""

    smtp_host: str
    smtp_port: int
    smtp_use_tls: bool
    smtp_username: str | None
    smtp_from_email: str | None
    smtp_from_name: str
    is_configured: bool

    model_config = {"from_attributes": True}


class UserEmailConfigSave(BaseModel):
    """Body for PUT /email/config."""

    smtp_host: str = Field(default="smtp.gmail.com", max_length=255)
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_use_tls: bool = True
    smtp_username: str | None = Field(default=None, max_length=255)
    # Write-only — plain text sent from the client, stored encrypted server-side.
    # If None / omitted, the existing stored password is preserved.
    smtp_password: str | None = Field(default=None, description="App Password (write-only). Omit to keep existing.")
    smtp_from_email: str | None = Field(default=None, max_length=255)
    smtp_from_name: str = Field(default="SalesGenie", max_length=150)


class EmailTestRequest(BaseModel):
    """Body for POST /email/test — all fields optional (uses saved config)."""

    to_address: str | None = Field(
        default=None,
        description="Destination address. Defaults to smtp_username if not provided.",
    )


class EmailTestResult(BaseModel):
    """Response from POST /email/test."""

    success: bool
    message: str
