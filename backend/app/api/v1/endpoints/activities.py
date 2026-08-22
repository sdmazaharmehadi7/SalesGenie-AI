"""Activities / Sales Interactions endpoints (Timeline across CRM entities)."""

import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentActiveUser, DBSession, WorkspaceContextDep
from app.schemas.sales_interaction import (
    ActivityListItem,
    SalesInteractionCreate,
    SalesInteractionRead,
)
from app.services.account_service import AccountService
from app.services.activity_service import ActivityService
from app.services.contact_service import ContactService
from app.services.lead_service import LeadService
from app.services.opportunity_service import OpportunityService

router = APIRouter()


@router.post("", response_model=SalesInteractionRead, status_code=status.HTTP_201_CREATED, summary="Log an activity")
async def log_activity(
    activity_in: SalesInteractionCreate,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> SalesInteractionRead:
    # Verify entity ownership if provided
    if activity_in.lead_id:
        await LeadService(db).get_lead(activity_in.lead_id, current_user, ws_ctx=ws_ctx)
    if activity_in.account_id:
        await AccountService(db).get_account(activity_in.account_id, current_user)
    if activity_in.contact_id:
        await ContactService(db).get_contact(activity_in.contact_id, current_user)
    if activity_in.opportunity_id:
        await OpportunityService(db).get_opportunity(activity_in.opportunity_id, current_user, ws_ctx=ws_ctx)

    activity = await ActivityService(db).log_activity(activity_in, current_user, ws_ctx=ws_ctx)
    return SalesInteractionRead.model_validate(activity)


@router.get("", response_model=list[ActivityListItem], summary="List timeline activities (filterable by entity)")
async def list_activities(
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
    lead_id: uuid.UUID | None = None,
    contact_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
    opportunity_id: uuid.UUID | None = None,
    limit: int = 50,
) -> list[ActivityListItem]:
    if lead_id:
        await LeadService(db).get_lead(lead_id, current_user, ws_ctx=ws_ctx)
    if account_id:
        await AccountService(db).get_account(account_id, current_user)
    if contact_id:
        await ContactService(db).get_contact(contact_id, current_user)
    if opportunity_id:
        await OpportunityService(db).get_opportunity(opportunity_id, current_user, ws_ctx=ws_ctx)

    activities = await ActivityService(db).get_timeline(
        current_user,
        ws_ctx=ws_ctx,
        lead_id=lead_id,
        contact_id=contact_id,
        account_id=account_id,
        opportunity_id=opportunity_id,
        limit=limit,
    )
    return [ActivityListItem.model_validate(a) for a in activities]
