"""Activities / Sales Interactions endpoints (Timeline across CRM entities)."""

import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentActiveUser, DBSession
from app.schemas.sales_interaction import (
    ActivityListItem,
    SalesInteractionCreate,
    SalesInteractionRead,
)
from app.services.activity_service import ActivityService

router = APIRouter()


@router.post("", response_model=SalesInteractionRead, status_code=status.HTTP_201_CREATED, summary="Log an activity")
async def log_activity(
    activity_in: SalesInteractionCreate, db: DBSession, current_user: CurrentActiveUser
) -> SalesInteractionRead:
    activity = await ActivityService(db).log_activity(activity_in, current_user)
    return SalesInteractionRead.model_validate(activity)


@router.get("", response_model=list[ActivityListItem], summary="List timeline activities (filterable by entity)")
async def list_activities(
    db: DBSession,
    current_user: CurrentActiveUser,
    lead_id: uuid.UUID | None = None,
    contact_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
    opportunity_id: uuid.UUID | None = None,
    limit: int = 50,
) -> list[ActivityListItem]:
    activities = await ActivityService(db).get_timeline(
        lead_id=lead_id,
        contact_id=contact_id,
        account_id=account_id,
        opportunity_id=opportunity_id,
        limit=limit,
    )
    return [ActivityListItem.model_validate(a) for a in activities]
