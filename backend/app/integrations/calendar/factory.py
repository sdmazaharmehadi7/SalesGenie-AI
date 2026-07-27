"""Factory for the configured `CalendarProvider` implementation."""

from functools import lru_cache

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.integrations.calendar.base import CalendarProvider
from app.integrations.calendar.google_calendar_client import (
    GoogleCalendarClient,
    MockCalendarClient,
)


@lru_cache
def get_calendar_provider() -> CalendarProvider:
    if settings.CALENDAR_PROVIDER == "mock":
        return MockCalendarClient()
    if settings.CALENDAR_PROVIDER == "google":
        return GoogleCalendarClient()
    raise ServiceUnavailableError(
        f"Unknown CALENDAR_PROVIDER '{settings.CALENDAR_PROVIDER}'. Expected 'mock' or 'google'.",
        error_code="calendar_misconfigured",
    )
