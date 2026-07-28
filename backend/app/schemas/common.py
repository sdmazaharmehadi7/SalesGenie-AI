"""Common Pydantic v2 schemas shared across the whole API surface."""

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field


class ORMBaseModel(BaseModel):
    """
    Base class for response schemas that are built from SQLAlchemy ORM
    objects. `from_attributes=True` (Pydantic v2's replacement for
    `orm_mode`) lets `Model.model_validate(some_orm_instance)` work.
    """

    model_config = ConfigDict(from_attributes=True)


class ErrorDetail(BaseModel):
    error_code: str
    message: str
    details: object | None = None


class ErrorResponse(BaseModel):
    """Consistent shape for every error the API returns."""

    error: ErrorDetail


class HealthStatus(BaseModel):
    status: str = Field(examples=["ok", "degraded"])
    environment: str
    version: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DependencyHealth(BaseModel):
    database: str = Field(examples=["ok", "unavailable"])
