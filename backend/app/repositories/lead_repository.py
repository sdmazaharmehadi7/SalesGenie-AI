"""
Lead repository.

The only place that issues SQLAlchemy queries against the `leads` table.
Supports the filtering/pagination the Lead Management module's list
endpoint needs (by status, by owner/assignee, free-text search on company name).
"""

import uuid

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.models.pipeline_enums import LeadStatus
from app.schemas.lead import LeadCreate, LeadUpdate


class LeadRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, lead_id: uuid.UUID) -> Lead | None:
        return await self.db.get(Lead, lead_id)

    async def create(
        self,
        lead_in: LeadCreate,
        *,
        creator_id: uuid.UUID | None = None,
        assignee_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> Lead:
        """
        Create a lead with workspace-aware ownership and assignment.

        Flexible signature supports:
          - New callers: creator_id + assignee_id + workspace_id
          - V1 callers: owner_id (+ optional workspace_id)
        """
        # Resolve effective creator
        effective_creator = (
            creator_id
            or owner_id
            or lead_in.owner_id
        )

        # Resolve effective assignee
        effective_assignee = (
            lead_in.assigned_to
            or assignee_id
            or lead_in.owner_id
            or owner_id
            or effective_creator
        )

        # Resolve effective workspace_id
        effective_workspace_id = (
            workspace_id
            if workspace_id is not None
            else lead_in.workspace_id
        )

        lead = Lead(
            company_name=lead_in.company_name,
            industry=lead_in.industry,
            contact_name=lead_in.contact_name,
            email=lead_in.email,
            phone=lead_in.phone,
            deal_value=lead_in.deal_value,
            lead_status=lead_in.lead_status,
            # Explicit new fields
            created_by=effective_creator,
            assigned_to=effective_assignee,
            # Legacy field kept in sync with assigned_to for backward compatibility
            owner_id=effective_assignee,
            workspace_id=effective_workspace_id,
        )
        self.db.add(lead)
        await self.db.flush()
        await self.db.refresh(lead)
        return lead

    async def update(self, lead: Lead, lead_in: LeadUpdate) -> Lead:
        update_data = lead_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(lead, field, value)

        # Keep owner_id and assigned_to synchronized
        if "assigned_to" in update_data and update_data["assigned_to"] is not None:
            lead.owner_id = update_data["assigned_to"]
        elif "owner_id" in update_data and update_data["owner_id"] is not None:
            # Legacy client passed owner_id — treat as assigned_to
            lead.assigned_to = update_data["owner_id"]

        await self.db.flush()
        await self.db.refresh(lead)
        return lead

    async def delete(self, lead: Lead) -> None:
        await self.db.delete(lead)
        await self.db.flush()

    async def list_leads(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        # Scoping
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
        # Filtering by assignee — supports both new (assigned_to) and legacy (owner_id) callers
        assigned_to: uuid.UUID | None = None,
        owner_id: uuid.UUID | None = None,
        # Standard filters
        status: LeadStatus | None = None,
        search: str | None = None,
    ) -> tuple[list[Lead], int]:
        """
        Returns `(page_of_leads, total_matching_count)` scoped by workspace or personal area.
        """
        effective_assignee = assigned_to or owner_id

        filters: list[ColumnElement[bool]] = []

        # Workspace / Personal Area scoping
        if is_personal:
            filters.append(Lead.workspace_id.is_(None))
        elif workspace_id is not None:
            filters.append(Lead.workspace_id == workspace_id)

        # Assignee scoping — checks both assigned_to and owner_id columns for V1 compat
        if effective_assignee is not None:
            filters.append(
                or_(
                    Lead.assigned_to == effective_assignee,
                    Lead.owner_id == effective_assignee,
                )
            )

        if status is not None:
            filters.append(Lead.lead_status == status)
        if search:
            like_pattern = f"%{search}%"
            filters.append(
                or_(Lead.company_name.ilike(like_pattern), Lead.contact_name.ilike(like_pattern))
            )

        base_query = select(Lead)
        count_query = select(func.count()).select_from(Lead)
        for condition in filters:
            base_query = base_query.where(condition)
            count_query = count_query.where(condition)

        total = (await self.db.execute(count_query)).scalar_one()

        result = await self.db.execute(
            base_query.order_by(Lead.updated_at.desc()).offset(offset).limit(limit)
        )
        leads = list(result.scalars().all())
        return leads, total
