"""
Centralized application configuration.

All runtime configuration is sourced from environment variables (via a `.env`
file in local development, or real environment variables in staging/prod).
We use `pydantic-settings` (Pydantic v2) so that every value is validated
and type-coerced at startup — the app will refuse to boot with a clear
error if a required setting is missing or malformed, rather than failing
later at an unpredictable point in a request.
"""

from functools import lru_cache
from typing import Annotated, Any
from urllib.parse import quote

from pydantic import BeforeValidator, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_cors_origins(value: Any) -> list[str]:
    """Allow CORS origins to be provided as a comma-separated string or a list."""
    if isinstance(value, str) and not value.startswith("["):
        return [origin.strip() for origin in value.split(",") if origin.strip()]
    if isinstance(value, (list, str)):
        return value  # type: ignore[return-value]
    raise ValueError(value)


CorsOrigins = Annotated[list[str], BeforeValidator(_parse_cors_origins)]


class Settings(BaseSettings):
    """
    Strongly-typed application settings.

    Values are read from environment variables (case-insensitive) and,
    in local development, from a `.env` file. See `.env.example` for the
    full list of variables this application understands.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # General application settings
    # ------------------------------------------------------------------
    PROJECT_NAME: str = "SalesGenie AI"
    ENVIRONMENT: str = "development"  # development | staging | production | test
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # ------------------------------------------------------------------
    # Security / JWT
    # ------------------------------------------------------------------
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "salesgenie"

    # Optional full DSN override. If not supplied, it is assembled from the
    # discrete POSTGRES_* fields above by the `assemble_db_connection`
    # validator below.
    SQLALCHEMY_DATABASE_URI: str | None = None

    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_ECHO: bool = False

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None, info: Any) -> str:
        """
        Build the sync (psycopg) DSN used by Alembic, from the discrete
        POSTGRES_* fields — unless an explicit override was supplied.

        Assembled manually (rather than via `PostgresDsn.build`) so the
        exact output format doesn't depend on the installed pydantic
        patch version's URL-quoting behavior.
        """
        if isinstance(v, str) and v:
            return v
        data = info.data
        user = quote(str(data.get("POSTGRES_USER")), safe="")
        password = quote(str(data.get("POSTGRES_PASSWORD")), safe="")
        host = data.get("POSTGRES_SERVER")
        port = data.get("POSTGRES_PORT")
        db = data.get("POSTGRES_DB")
        return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db}"

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    BACKEND_CORS_ORIGINS: CorsOrigins = []

    # ------------------------------------------------------------------
    # AI integration (Lead Intelligence, Scoring, Outreach, Conversation
    # Summarization). "mock" requires no external credentials and is the
    # default so the app boots and is fully testable out of the box;
    # switch AI_PROVIDER to "openai" in production and set OPENAI_API_KEY.
    # ------------------------------------------------------------------
    AI_PROVIDER: str = "mock"  # mock | openai | gemini
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_TIMEOUT_SECONDS: int = 30
    OPENAI_MAX_RETRIES: int = 2
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ------------------------------------------------------------------
    # Email integration (Outreach Automation Engine)
    # ------------------------------------------------------------------
    EMAIL_PROVIDER: str = "console"  # console | smtp
    EMAIL_FROM_ADDRESS: str = "noreply@salesgenie.ai"
    EMAIL_FROM_NAME: str = "SalesGenie AI"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_USE_TLS: bool = True

    # ------------------------------------------------------------------
    # Calendar integration (meeting scheduling from a lead/interaction)
    # ------------------------------------------------------------------
    CALENDAR_PROVIDER: str = "mock"  # mock | google
    GOOGLE_CALENDAR_ACCESS_TOKEN: str | None = None
    GOOGLE_CALENDAR_ID: str = "primary"
    GOOGLE_CALENDAR_API_BASE_URL: str = "https://www.googleapis.com/calendar/v3"
    CALENDAR_REQUEST_TIMEOUT_SECONDS: int = 15

    # ------------------------------------------------------------------
    # CRM integration (sync leads/activities to an external CRM)
    # ------------------------------------------------------------------
    CRM_DEFAULT_PLATFORM: str = "mock"  # mock | salesforce | hubspot
    SALESFORCE_INSTANCE_URL: str | None = None
    SALESFORCE_ACCESS_TOKEN: str | None = None
    HUBSPOT_ACCESS_TOKEN: str | None = None
    HUBSPOT_API_BASE_URL: str = "https://api.hubapi.com"
    CRM_REQUEST_TIMEOUT_SECONDS: int = 15

    # ------------------------------------------------------------------
    # Logging
    # ------------------------------------------------------------------
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT.lower() == "test"


@lru_cache
def get_settings() -> Settings:
    """
    Return a cached `Settings` instance.

    `lru_cache` ensures the environment/`.env` file is only parsed once per
    process, and lets us swap settings cleanly in tests via
    `get_settings.cache_clear()` + dependency override.
    """
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
