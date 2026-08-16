"""
Lead service.

Handles lead creation, retrieval, updates, deletions, and listing with strict multi-user data isolation.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.lead import Lead
from app.models.pipeline_enums import LeadStatus
from app.models.user import User, UserRole
from app.repositories.lead_repository import LeadRepository
from app.schemas.lead import LeadCreate, LeadUpdate

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


def _resolve_owner_id(current_user: User, requested_owner_id: uuid.UUID | None = None) -> uuid.UUID | None:
    """
    Restricted-role users (e.g. SALES_REP, BDR) always see only their own data.
    Unrestricted roles (ADMIN, SALES_MANAGER, REVOPS) can view all or filter by requested owner.
    """
    if current_user.role in UNRESTRICTED_ROLES:
        return requested_owner_id
    return current_user.id


class LeadService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.leads = LeadRepository(db)

    async def create_lead(self, lead_in: LeadCreate, current_user: User) -> Lead:
        # Never allow standard users to assign leads to arbitrary owners
        owner_id = lead_in.owner_id if (current_user.role in UNRESTRICTED_ROLES and lead_in.owner_id) else current_user.id
        lead = await self.leads.create(lead_in, owner_id=owner_id)
        await self.db.commit()
        return lead

    async def get_lead(self, lead_id: uuid.UUID, current_user: User) -> Lead:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            raise NotFoundError("Lead not found.", error_code="lead_not_found")

        # Multi-user data isolation check
        if current_user.role not in UNRESTRICTED_ROLES and lead.owner_id != current_user.id:
            raise NotFoundError("Lead not found.", error_code="lead_not_found")

        return lead

    async def update_lead(
        self, lead_id: uuid.UUID, lead_in: LeadUpdate, current_user: User
    ) -> Lead:
        lead = await self.get_lead(lead_id, current_user)
        updated = await self.leads.update(lead, lead_in)
        await self.db.commit()
        return updated

    async def delete_lead(self, lead_id: uuid.UUID, current_user: User) -> None:
        lead = await self.get_lead(lead_id, current_user)
        await self.leads.delete(lead)
        await self.db.commit()

    async def list_leads(
        self,
        current_user: User,
        *,
        offset: int,
        limit: int,
        status: LeadStatus | None = None,
        search: str | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> tuple[list[Lead], int]:
        effective_owner = _resolve_owner_id(current_user, owner_id)
        return await self.leads.list_leads(
            offset=offset,
            limit=limit,
            owner_id=effective_owner,
            status=status,
            search=search,
        )
