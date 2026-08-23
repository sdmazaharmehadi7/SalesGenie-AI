"""
AI Outreach Generation endpoints (Module 5).

Three distinct actions per campaign: generate (AI drafts it), update (a
rep edits the draft), send (actually delivers it via the email provider)
— matching `OutreachService`'s split of the same three responsibilities.
"""

import uuid

from fastapi import APIRouter, status

from app.api.deps import (
    AIProviderDep,
    CurrentActiveUser,
    DBSession,
    EmailProviderDep,
    WorkspaceContextDep,
)
from app.schemas.outreach_campaign import OutreachCampaignRead, OutreachCampaignUpdate
from app.services.outreach_service import OutreachService

router = APIRouter()


@router.post(
    "/{lead_id}/campaigns/generate",
    response_model=OutreachCampaignRead,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new AI-drafted outreach email for a lead",
)
async def generate_campaign(
    lead_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    email_provider: EmailProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> OutreachCampaignRead:
    campaign = await OutreachService(db, ai_provider, email_provider).generate_campaign(
        lead_id, current_user, ws_ctx=ws_ctx
    )
    return OutreachCampaignRead.model_validate(campaign)


@router.patch(
    "/{lead_id}/campaigns/{campaign_id}",
    response_model=OutreachCampaignRead,
    summary="Edit a draft outreach email",
)
async def update_campaign(
    lead_id: uuid.UUID,
    campaign_id: uuid.UUID,
    campaign_in: OutreachCampaignUpdate,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    email_provider: EmailProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> OutreachCampaignRead:
    campaign = await OutreachService(db, ai_provider, email_provider).update_campaign(
        lead_id, campaign_id, campaign_in, current_user, ws_ctx=ws_ctx
    )
    return OutreachCampaignRead.model_validate(campaign)


@router.post(
    "/{lead_id}/campaigns/{campaign_id}/send",
    response_model=OutreachCampaignRead,
    summary="Send an outreach email to the lead's contact",
)
async def send_campaign(
    lead_id: uuid.UUID,
    campaign_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    email_provider: EmailProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> OutreachCampaignRead:
    campaign = await OutreachService(db, ai_provider, email_provider).send_campaign(
        lead_id, campaign_id, current_user, ws_ctx=ws_ctx
    )
    return OutreachCampaignRead.model_validate(campaign)


@router.get(
    "/{lead_id}/campaigns",
    response_model=list[OutreachCampaignRead],
    summary="List all outreach campaigns for a lead",
)
async def list_campaigns(
    lead_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    email_provider: EmailProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> list[OutreachCampaignRead]:
    campaigns = await OutreachService(db, ai_provider, email_provider).list_campaigns(
        lead_id, current_user, ws_ctx=ws_ctx
    )
    return [OutreachCampaignRead.model_validate(campaign) for campaign in campaigns]
