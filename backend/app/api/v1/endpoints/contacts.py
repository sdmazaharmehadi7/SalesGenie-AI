"""Contacts endpoints (CRM)."""

import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentActiveUser, DBSession, Pagination, WorkspaceContextDep
from app.schemas.contact import (
    ContactCreate,
    ContactListItem,
    ContactRead,
    ContactUpdate,
    PaginatedContacts,
)
from app.schemas.sales_interaction import ActivityListItem
from app.services.activity_service import ActivityService
from app.services.contact_service import ContactService

router = APIRouter()


@router.post("", response_model=ContactRead, status_code=status.HTTP_201_CREATED, summary="Create a contact")
async def create_contact(contact_in: ContactCreate, db: DBSession, current_user: CurrentActiveUser) -> ContactRead:
    contact = await ContactService(db).create_contact(contact_in, current_user)
    return ContactRead.model_validate(contact)


@router.get("", response_model=PaginatedContacts, summary="List contacts")
async def list_contacts(
    db: DBSession,
    current_user: CurrentActiveUser,
    pagination: Pagination,
    account_id: uuid.UUID | None = None,
    lead_id: uuid.UUID | None = None,
    search: str | None = None,
    owner_id: uuid.UUID | None = None,
) -> PaginatedContacts:
    contacts, total = await ContactService(db).list_contacts(
        current_user,
        offset=pagination.offset,
        limit=pagination.page_size,
        account_id=account_id,
        lead_id=lead_id,
        search=search,
        owner_id=owner_id,
    )
    return PaginatedContacts(
        items=[ContactListItem.model_validate(c) for c in contacts],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{contact_id}", response_model=ContactRead, summary="Get contact details")
async def get_contact(contact_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> ContactRead:
    contact = await ContactService(db).get_contact(contact_id, current_user)
    return ContactRead.model_validate(contact)


@router.patch("/{contact_id}", response_model=ContactRead, summary="Update a contact")
async def update_contact(
    contact_id: uuid.UUID, contact_in: ContactUpdate, db: DBSession, current_user: CurrentActiveUser
) -> ContactRead:
    contact = await ContactService(db).update_contact(contact_id, contact_in, current_user)
    return ContactRead.model_validate(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a contact")
async def delete_contact(contact_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> None:
    await ContactService(db).delete_contact(contact_id, current_user)


@router.get("/{contact_id}/activities", response_model=list[ActivityListItem], summary="Get contact activity timeline")
async def get_contact_activities(
    contact_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> list[ActivityListItem]:
    await ContactService(db).get_contact(contact_id, current_user)
    activities = await ActivityService(db).get_timeline(current_user=current_user, ws_ctx=ws_ctx, contact_id=contact_id)
    return [ActivityListItem.model_validate(a) for a in activities]
