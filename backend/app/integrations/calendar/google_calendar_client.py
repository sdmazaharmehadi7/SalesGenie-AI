"""Concrete calendar provider implementations."""

import uuid
from datetime import datetime

import httpx

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import get_logger
from app.integrations.calendar.base import CalendarEventResult, CalendarProvider

logger = get_logger(__name__)


class MockCalendarClient(CalendarProvider):
    """
    Default calendar client — "creates" the event by logging it and
    returning a locally generated event id, so meeting scheduling is
    fully testable without a connected Google account.
    """

    async def create_event(
        self,
        *,
        title: str,
        description: str | None,
        start_time: datetime,
        end_time: datetime,
        attendee_emails: list[str],
    ) -> CalendarEventResult:
        event_id = str(uuid.uuid4())
        logger.info(
            "Calendar event created (mock mode — not synced to a real calendar)",
            extra={
                "event_id": event_id,
                "title": title,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "attendees": attendee_emails,
            },
        )
        return CalendarEventResult(
            event_id=event_id, html_link=None, start_time=start_time, end_time=end_time
        )


class GoogleCalendarClient(CalendarProvider):
    """
    Real Google Calendar API v3 client. Requires a valid OAuth2 access
    token in `GOOGLE_CALENDAR_ACCESS_TOKEN` with `calendar.events` scope
    (obtaining/refreshing that token is out of scope for this client —
    it's expected to be supplied already-valid, e.g. by an upstream
    OAuth flow or a service account exchange).
    """

    def __init__(self) -> None:
        if not settings.GOOGLE_CALENDAR_ACCESS_TOKEN:
            raise ServiceUnavailableError(
                "CALENDAR_PROVIDER is set to 'google' but "
                "GOOGLE_CALENDAR_ACCESS_TOKEN is not configured.",
                error_code="calendar_not_configured",
            )
        self.access_token = settings.GOOGLE_CALENDAR_ACCESS_TOKEN
        self.calendar_id = settings.GOOGLE_CALENDAR_ID
        self.base_url = settings.GOOGLE_CALENDAR_API_BASE_URL.rstrip("/")
        self.timeout_seconds = settings.CALENDAR_REQUEST_TIMEOUT_SECONDS

    async def create_event(
        self,
        *,
        title: str,
        description: str | None,
        start_time: datetime,
        end_time: datetime,
        attendee_emails: list[str],
    ) -> CalendarEventResult:
        url = f"{self.base_url}/calendars/{self.calendar_id}/events"
        payload = {
            "summary": title,
            "description": description or "",
            "start": {"dateTime": start_time.isoformat()},
            "end": {"dateTime": end_time.isoformat()},
            "attendees": [{"email": email} for email in attendee_emails],
        }
        headers = {"Authorization": f"Bearer {self.access_token}"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                body = response.json()
        except httpx.HTTPError as exc:
            logger.error("Google Calendar event creation failed: %s", exc)
            raise ServiceUnavailableError(
                "Failed to create the calendar event.", error_code="calendar_request_failed"
            ) from exc

        return CalendarEventResult(
            event_id=body["id"],
            html_link=body.get("htmlLink"),
            start_time=start_time,
            end_time=end_time,
        )
