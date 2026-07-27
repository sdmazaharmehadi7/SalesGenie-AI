"""
Lead service.

Owns the business rules around who can see/modify which leads:
`SALES_REP` and `BDR` users are scoped to leads they own; `ADMIN`,
`SALES_MANAGER`, and `REVOPS` can see and manage every lead. This
scoping is applied here (not in the repository, which is a dumb data
layer, and not in the endpoint, which should stay thin) so it's applied
consistently everywhere a lead is read or written.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.lead import Lead
from app.models.pipeline_enums import LeadStatus
from app.models.user import User, UserRole
from app.repositories.lead_repository import LeadRepository
from app.schemas.lead import LeadCreate, LeadUpdate

# Roles that can see/manage every lead, not just their own.
UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class LeadService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.leads = LeadRepository(db)

    @staticmethod
    def _can_view_all(user: User) -> bool:
        return user.role in UNRESTRICTED_ROLES

    async def create_lead(self, lead_in: LeadCreate, current_user: User) -> Lead:
        lead = await self.leads.create(lead_in, owner_id=current_user.id)
        await self.db.commit()
        return lead

    async def get_lead(self, lead_id: uuid.UUID, current_user: User) -> Lead:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            raise NotFoundError("Lead not found.", error_code="lead_not_found")
        if not self._can_view_all(current_user) and lead.owner_id != current_user.id:
            raise ForbiddenError(
                "You do not have access to this lead.", error_code="lead_access_denied"
            )
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
        """
        `owner_id` lets an unrestricted-role user explicitly filter to one
        rep's leads (e.g. a manager reviewing a specific rep's pipeline).
        A restricted-role user is always forced to their own id, even if
        they pass a different `owner_id` — that parameter is simply
        overridden, not rejected, to keep the endpoint simple.
        """
        effective_owner_id = owner_id
        if not self._can_view_all(current_user):
            effective_owner_id = current_user.id

        return await self.leads.list_leads(
            offset=offset,
            limit=limit,
            owner_id=effective_owner_id,
            status=status,
            search=search,
        )
