"""
Conversation Intelligence service (Module 7: Conversation Intelligence &
CRM Integration — the conversation-summarization half; CRM sync itself
lives in `crm_integration_service.py`).

Also owns meeting scheduling (`schedule_follow_up`): the Calendar
integration is exposed through this service, since scheduling a follow-up
is naturally something a rep does right after reviewing a conversation's
action items.
"""

import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.integrations.ai.base import AIProvider
from app.integrations.calendar.base import CalendarEventResult, CalendarProvider
from app.models.sales_interaction import SalesInteraction
from app.repositories.sales_interaction_repository import SalesInteractionRepository
from app.schemas.sales_interaction import SalesInteractionCreate
from app.services.lead_service import LeadService


class ConversationService:
    def __init__(
        self, db: AsyncSession, ai_provider: AIProvider, calendar_provider: CalendarProvider
    ) -> None:
        self.db = db
        self.ai_provider = ai_provider
        self.calendar_provider = calendar_provider
        self.interactions = SalesInteractionRepository(db)
        self.lead_service = LeadService(db)

    async def summarize_and_log(
        self,
        lead_id: uuid.UUID,
        transcript: str,
        interaction_type,
        current_user,
    ) -> SalesInteraction:
        """
        Summarize a raw transcript with the AI provider and persist the
        result as a `SalesInteraction`. The raw transcript itself is not
        stored — only the summary + extracted action items — matching the
        `Sales_Interactions` schema, which has no `transcript` column.
        """
        lead = await self.lead_service.get_lead(lead_id, current_user)

        raw_result = await self.ai_provider.summarize_conversation(transcript=transcript)
        interaction_in = SalesInteractionCreate(
            interaction_type=interaction_type,
            summary=raw_result.get("summary"),
            action_items=raw_result.get("action_items", []),
        )

        interaction = await self.interactions.create(interaction_in, lead.id)
        await self.db.commit()
        return interaction

    async def log_interaction(
        self, lead_id: uuid.UUID, interaction_in: SalesInteractionCreate, current_user
    ) -> SalesInteraction:
        """Log an interaction directly (summary/action items already known — no AI call)."""
        lead = await self.lead_service.get_lead(lead_id, current_user)
        interaction = await self.interactions.create(interaction_in, lead.id)
        await self.db.commit()
        return interaction

    async def list_interactions(self, lead_id: uuid.UUID, current_user) -> list[SalesInteraction]:
        await self.lead_service.get_lead(lead_id, current_user)
        return await self.interactions.list_for_lead(lead_id)

    async def schedule_follow_up(
        self,
        lead_id: uuid.UUID,
        *,
        title: str,
        description: str | None,
        start_time: datetime,
        end_time: datetime,
        current_user,
    ) -> CalendarEventResult:
        lead = await self.lead_service.get_lead(lead_id, current_user)

        if end_time <= start_time:
            raise ConflictError(
                "Meeting end time must be after the start time.", error_code="invalid_time_range"
            )

        attendees = [email for email in [lead.email, current_user.email] if email]
        return await self.calendar_provider.create_event(
            title=title,
            description=description,
            start_time=start_time,
            end_time=end_time,
            attendee_emails=attendees,
        )
