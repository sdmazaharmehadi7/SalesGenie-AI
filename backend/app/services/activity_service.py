"""Activity service — unified timeline & activity management with multi-user isolation."""

import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.sales_interaction import SalesInteraction
from app.models.user import User, UserRole
from app.repositories.sales_interaction_repository import SalesInteractionRepository
from app.schemas.sales_interaction import SalesInteractionCreate

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class ActivityService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.interactions = SalesInteractionRepository(db)

    async def log_activity(
        self,
        activity_in: SalesInteractionCreate,
        current_user: User,
    ) -> SalesInteraction:
        interaction = await self.interactions.create(activity_in)
        await self.db.commit()
        return interaction

    async def get_timeline(
        self,
        current_user: User | None = None,
        *,
        lead_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        opportunity_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[SalesInteraction]:
        # If specific entity is requested
        if lead_id or contact_id or account_id or opportunity_id:
            return await self.interactions.list_for_entity(
                lead_id=lead_id,
                contact_id=contact_id,
                account_id=account_id,
                opportunity_id=opportunity_id,
                limit=limit,
            )

        # General timeline
        if current_user and current_user.role not in UNRESTRICTED_ROLES:
            user_lead_ids = select(Lead.id).where(Lead.owner_id == current_user.id)
            user_opp_ids = select(Opportunity.id).where(Opportunity.owner_id == current_user.id)
            user_acc_ids = select(Account.id).where(Account.owner_id == current_user.id)
            user_con_ids = select(Contact.id).where(Contact.owner_id == current_user.id)

            act_query = (
                select(SalesInteraction)
                .where(
                    or_(
                        SalesInteraction.lead_id.in_(user_lead_ids),
                        SalesInteraction.opportunity_id.in_(user_opp_ids),
                        SalesInteraction.account_id.in_(user_acc_ids),
                        SalesInteraction.contact_id.in_(user_con_ids),
                    )
                )
                .order_by(SalesInteraction.interaction_date.desc())
                .limit(limit)
            )
            act_result = await self.db.execute(act_query)
            return list(act_result.scalars().all())

        return await self.interactions.list_recent(limit=limit)

    async def get_recent_activities(self, limit: int = 20) -> list[SalesInteraction]:
        return await self.interactions.list_recent(limit=limit)
