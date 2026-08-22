"""
Lead Management endpoints (Module 3).

Access control: every handler delegates to `LeadService`, which applies
workspace and ownership scoping:
- MANAGER: full workspace visibility, can reassign leads, can delete leads.
- TEAM_MEMBER: assigned workspace leads only, cannot reassign, cannot delete.
- PERSONAL AREA: user's personal leads only, completely isolated.
"""

import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentActiveUser, DBSession, Pagination, WorkspaceContextDep
from app.models.pipeline_enums import LeadStatus
from app.schemas.lead import LeadCreate, LeadListItem, LeadRead, LeadUpdate, PaginatedLeads
from app.services.lead_service import LeadService

router = APIRouter()


@router.post("", response_model=LeadRead, status_code=status.HTTP_201_CREATED, summary="Create a lead")
async def create_lead(
    lead_in: LeadCreate,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> LeadRead:
    lead = await LeadService(db).create_lead(lead_in, current_user, ws_ctx=ws_ctx)
    return LeadRead.model_validate(lead)


@router.get("", response_model=PaginatedLeads, summary="List leads (filterable, paginated)")
async def list_leads(
    db: DBSession,
    current_user: CurrentActiveUser,
    pagination: Pagination,
    ws_ctx: WorkspaceContextDep,
    status_filter: LeadStatus | None = None,
    search: str | None = None,
    owner_id: uuid.UUID | None = None,
) -> PaginatedLeads:
    leads, total = await LeadService(db).list_leads(
        current_user,
        ws_ctx=ws_ctx,
        offset=pagination.offset,
        limit=pagination.page_size,
        status=status_filter,
        search=search,
        owner_id=owner_id,
    )
    return PaginatedLeads(
        items=[LeadListItem.model_validate(lead) for lead in leads],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{lead_id}", response_model=LeadRead, summary="Get a single lead")
async def get_lead(
    lead_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> LeadRead:
    lead = await LeadService(db).get_lead(lead_id, current_user, ws_ctx=ws_ctx)
    return LeadRead.model_validate(lead)


@router.patch("/{lead_id}", response_model=LeadRead, summary="Update a lead")
async def update_lead(
    lead_id: uuid.UUID,
    lead_in: LeadUpdate,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> LeadRead:
    lead = await LeadService(db).update_lead(lead_id, lead_in, current_user, ws_ctx=ws_ctx)
    return LeadRead.model_validate(lead)


@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a lead",
)
async def delete_lead(
    lead_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> None:
    await LeadService(db).delete_lead(lead_id, current_user, ws_ctx=ws_ctx)
