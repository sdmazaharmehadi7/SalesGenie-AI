"""Accounts endpoints (CRM)."""

import uuid

from fastapi import APIRouter, status

from app.ai.services import generate_company_intelligence
from app.api.deps import CurrentActiveUser, DBSession, Pagination, WorkspaceContextDep
from app.schemas.account import (
    AccountCreate,
    AccountListItem,
    AccountRead,
    AccountUpdate,
    PaginatedAccounts,
)
from app.schemas.contact import ContactListItem
from app.schemas.opportunity import OpportunityListItem
from app.schemas.sales_interaction import ActivityListItem
from app.services.account_service import AccountService
from app.services.activity_service import ActivityService
from app.services.contact_service import ContactService
from app.services.opportunity_service import OpportunityService

router = APIRouter()


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED, summary="Create an account")
async def create_account(account_in: AccountCreate, db: DBSession, current_user: CurrentActiveUser) -> AccountRead:
    account = await AccountService(db).create_account(account_in, current_user)
    return AccountRead.model_validate(account)


@router.get("", response_model=PaginatedAccounts, summary="List accounts")
async def list_accounts(
    db: DBSession,
    current_user: CurrentActiveUser,
    pagination: Pagination,
    search: str | None = None,
    owner_id: uuid.UUID | None = None,
) -> PaginatedAccounts:
    accounts, total = await AccountService(db).list_accounts(
        current_user,
        offset=pagination.offset,
        limit=pagination.page_size,
        search=search,
        owner_id=owner_id,
    )
    return PaginatedAccounts(
        items=[AccountListItem.model_validate(a) for a in accounts],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{account_id}", response_model=AccountRead, summary="Get account details")
async def get_account(account_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> AccountRead:
    account = await AccountService(db).get_account(account_id, current_user)
    return AccountRead.model_validate(account)


@router.patch("/{account_id}", response_model=AccountRead, summary="Update an account")
async def update_account(
    account_id: uuid.UUID, account_in: AccountUpdate, db: DBSession, current_user: CurrentActiveUser
) -> AccountRead:
    account = await AccountService(db).update_account(account_id, account_in, current_user)
    return AccountRead.model_validate(account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an account")
async def delete_account(account_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> None:
    await AccountService(db).delete_account(account_id, current_user)


@router.get("/{account_id}/contacts", response_model=list[ContactListItem], summary="List contacts for account")
async def get_account_contacts(account_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> list[ContactListItem]:
    await AccountService(db).get_account(account_id, current_user)
    contacts, _ = await ContactService(db).list_contacts(current_user, account_id=account_id, limit=100)
    return [ContactListItem.model_validate(c) for c in contacts]


@router.get("/{account_id}/opportunities", response_model=list[OpportunityListItem], summary="List opportunities for account")
async def get_account_opportunities(account_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> list[OpportunityListItem]:
    await AccountService(db).get_account(account_id, current_user)
    opps, _ = await OpportunityService(db).list_opportunities(current_user, account_id=account_id, limit=100)
    return [OpportunityListItem.model_validate(o) for o in opps]


@router.get("/{account_id}/activities", response_model=list[ActivityListItem], summary="Get account activity timeline")
async def get_account_activities(
    account_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> list[ActivityListItem]:
    await AccountService(db).get_account(account_id, current_user)
    activities = await ActivityService(db).get_timeline(current_user=current_user, ws_ctx=ws_ctx, account_id=account_id)
    return [ActivityListItem.model_validate(a) for a in activities]


@router.post("/{account_id}/insights", summary="Generate AI company intelligence for account")
async def generate_account_insights(account_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> dict:
    account = await AccountService(db).get_account(account_id, current_user)
    data, model = generate_company_intelligence(
        company_name=account.name,
        industry=account.industry,
        website=account.website,
        company_size=account.company_size,
        description=account.description,
    )
    return {"data": data, "model": model}
