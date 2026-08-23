"""
Outreach service (Module 5: AI Outreach Generation).

Covers both halves of the "Outreach Automation Engine" in the
architecture diagram: generating a personalized email with the AI
provider, and actually sending it via the email provider once a rep
approves it — two distinct actions (`generate_campaign` /
`send_campaign`) rather than one, so a rep can review/edit the
AI-drafted email before it goes out.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.core.exceptions import ConflictError, NotFoundError
from app.integrations.ai.base import AIProvider
from app.integrations.email.base import EmailProvider
from app.models.outreach_campaign import OutreachCampaign
from app.models.pipeline_enums import CampaignStatus, InteractionType
from app.repositories.company_insight_repository import CompanyInsightRepository
from app.repositories.outreach_campaign_repository import OutreachCampaignRepository
from app.repositories.sales_interaction_repository import SalesInteractionRepository
from app.schemas.outreach_campaign import OutreachCampaignCreate, OutreachCampaignUpdate
from app.schemas.sales_interaction import SalesInteractionCreate
from app.services.lead_service import LeadService


class OutreachService:
    def __init__(self, db: AsyncSession, ai_provider: AIProvider, email_provider: EmailProvider) -> None:
        self.db = db
        self.ai_provider = ai_provider
        self.email_provider = email_provider
        self.campaigns = OutreachCampaignRepository(db)
        self.insights = CompanyInsightRepository(db)
        self.lead_service = LeadService(db)
        self.interactions = SalesInteractionRepository(db)

    async def generate_campaign(
        self,
        lead_id: uuid.UUID,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> OutreachCampaign:
        lead = await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)
        latest_insight = await self.insights.get_latest_for_lead(lead.id)

        insight_dict = None
        if latest_insight is not None:
            insight_dict = {
                "business_needs": latest_insight.business_needs,
                "opportunities": latest_insight.opportunities,
            }

        raw_result = await self.ai_provider.generate_outreach_email(
            company_name=lead.company_name,
            contact_name=lead.contact_name,
            industry=lead.industry,
            insight=insight_dict,
        )
        campaign_in = OutreachCampaignCreate(
            email_subject=raw_result["email_subject"],
            email_content=raw_result["email_content"],
            campaign_status=CampaignStatus.DRAFT,
        )

        campaign = await self.campaigns.create(lead.id, campaign_in)
        await self.db.commit()
        return campaign

    async def update_campaign(
        self,
        lead_id: uuid.UUID,
        campaign_id: uuid.UUID,
        campaign_in: OutreachCampaignUpdate,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> OutreachCampaign:
        await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)  # enforces access control
        campaign = await self._get_campaign_for_lead(lead_id, campaign_id)
        updated = await self.campaigns.update(campaign, campaign_in)
        await self.db.commit()
        return updated

    async def send_campaign(
        self,
        lead_id: uuid.UUID,
        campaign_id: uuid.UUID,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> OutreachCampaign:
        lead = await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)
        campaign = await self._get_campaign_for_lead(lead_id, campaign_id)

        if campaign.campaign_status != CampaignStatus.DRAFT:
            raise ConflictError(
                f"Campaign has already been {campaign.campaign_status.value}.",
                error_code="campaign_already_sent",
            )
        if not lead.email:
            raise ConflictError(
                "This lead has no email address on file.", error_code="lead_missing_email"
            )

        await self.email_provider.send_email(
            to_address=lead.email,
            subject=campaign.email_subject,
            body=campaign.email_content,
        )

        updated = await self.campaigns.update(
            campaign, OutreachCampaignUpdate(campaign_status=CampaignStatus.SENT)
        )

        # Log an EMAIL activity to the CRM timeline so the sent email
        # appears in the lead's activity history automatically.
        activity = SalesInteractionCreate(
            interaction_type=InteractionType.EMAIL,
            lead_id=lead.id,
            workspace_id=lead.workspace_id,
            user_id=current_user.id,
            summary=f"Outreach email sent: {campaign.email_subject}",
            action_items=[],
        )
        await self.interactions.create(
            activity,
            lead_id=lead.id,
            workspace_id=lead.workspace_id,
            user_id=current_user.id,
        )

        await self.db.commit()
        return updated

    async def list_campaigns(
        self,
        lead_id: uuid.UUID,
        current_user,
        ws_ctx: WorkspaceContext | None = None,
    ) -> list[OutreachCampaign]:
        await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)
        return await self.campaigns.list_for_lead(lead_id)

    async def _get_campaign_for_lead(
        self, lead_id: uuid.UUID, campaign_id: uuid.UUID
    ) -> OutreachCampaign:
        campaign = await self.campaigns.get_by_id(campaign_id)
        if campaign is None or campaign.lead_id != lead_id:
            raise NotFoundError("Outreach campaign not found.", error_code="campaign_not_found")
        return campaign
