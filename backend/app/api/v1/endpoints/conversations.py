"""
Conversation Intelligence endpoints (Module 7 — summarization half).

`/summarize` runs a raw transcript through the AI provider and stores the
result; `""` (plain POST) lets a client log an interaction it has already
summarized itself (e.g. a CRM webhook), skipping the AI call entirely.
`/schedule` books a follow-up meeting via the calendar provider.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.api.deps import (
    AIProviderDep,
    CalendarProviderDep,
    CurrentActiveUser,
    DBSession,
    WorkspaceContextDep,
)
from app.models.pipeline_enums import InteractionType
from app.schemas.sales_interaction import SalesInteractionCreate, SalesInteractionRead
from app.services.conversation_service import ConversationService

router = APIRouter()


class TranscriptSummarizeRequest(BaseModel):
    transcript: str = Field(min_length=1)
    interaction_type: InteractionType = InteractionType.CALL


class ScheduleFollowUpRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    start_time: datetime
    end_time: datetime


class ScheduleFollowUpResponse(BaseModel):
    event_id: str
    html_link: str | None
    start_time: datetime
    end_time: datetime


@router.post(
    "/{lead_id}/interactions/summarize",
    response_model=SalesInteractionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Summarize a raw transcript with AI and log it as an interaction",
)
async def summarize_interaction(
    lead_id: uuid.UUID,
    payload: TranscriptSummarizeRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    calendar_provider: CalendarProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> SalesInteractionRead:
    interaction = await ConversationService(db, ai_provider, calendar_provider).summarize_and_log(
        lead_id, payload.transcript, payload.interaction_type, current_user, ws_ctx=ws_ctx
    )
    return SalesInteractionRead.model_validate(interaction)


@router.post(
    "/{lead_id}/interactions",
    response_model=SalesInteractionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Log an interaction directly (summary already known — no AI call)",
)
async def log_interaction(
    lead_id: uuid.UUID,
    interaction_in: SalesInteractionCreate,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    calendar_provider: CalendarProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> SalesInteractionRead:
    interaction = await ConversationService(db, ai_provider, calendar_provider).log_interaction(
        lead_id, interaction_in, current_user, ws_ctx=ws_ctx
    )
    return SalesInteractionRead.model_validate(interaction)


@router.get(
    "/{lead_id}/interactions",
    response_model=list[SalesInteractionRead],
    summary="List all logged interactions for a lead",
)
async def list_interactions(
    lead_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    calendar_provider: CalendarProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> list[SalesInteractionRead]:
    interactions = await ConversationService(db, ai_provider, calendar_provider).list_interactions(
        lead_id, current_user, ws_ctx=ws_ctx
    )
    return [SalesInteractionRead.model_validate(interaction) for interaction in interactions]


@router.post(
    "/{lead_id}/schedule",
    response_model=ScheduleFollowUpResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a follow-up meeting for a lead",
)
async def schedule_follow_up(
    lead_id: uuid.UUID,
    payload: ScheduleFollowUpRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    calendar_provider: CalendarProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> ScheduleFollowUpResponse:
    result = await ConversationService(db, ai_provider, calendar_provider).schedule_follow_up(
        lead_id,
        title=payload.title,
        description=payload.description,
        start_time=payload.start_time,
        end_time=payload.end_time,
        current_user=current_user,
        ws_ctx=ws_ctx,
    )
    return ScheduleFollowUpResponse(
        event_id=result.event_id,
        html_link=result.html_link,
        start_time=result.start_time,
        end_time=result.end_time,
    )
