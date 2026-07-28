"""
Calendar provider abstraction.

Used by the Conversation Intelligence / follow-up workflow to schedule a
meeting directly from a lead (e.g. "Schedule technical deep-dive with
engineering team" action item -> an actual calendar event). Two
implementations: `MockCalendarClient` (default, no external credentials
needed) and `GoogleCalendarClient` (real Google Calendar API v3 calls).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class CalendarEventResult:
    event_id: str
    html_link: str | None
    start_time: datetime
    end_time: datetime


class CalendarProvider(ABC):
    @abstractmethod
    async def create_event(
        self,
        *,
        title: str,
        description: str | None,
        start_time: datetime,
        end_time: datetime,
        attendee_emails: list[str],
    ) -> CalendarEventResult:
        raise NotImplementedError
