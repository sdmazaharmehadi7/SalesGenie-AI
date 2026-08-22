"""CRM Dashboard service — metrics aggregation, KPI queries, and predictive calculations with workspace isolation."""

import uuid
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.models.account import Account
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.pipeline_enums import OpportunityStage
from app.models.sales_interaction import SalesInteraction
from app.models.task import Task
from app.models.user import User, UserRole
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.sales_interaction_repository import SalesInteractionRepository
from app.repositories.task_repository import TaskRepository
from app.schemas.crm_dashboard import CRMDashboardSummary, PredictiveAnalytics
from app.schemas.opportunity import OpportunityListItem
from app.schemas.sales_interaction import ActivityListItem
from app.schemas.task import TaskListItem

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class CRMDashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.opportunities = OpportunityRepository(db)
        self.tasks = TaskRepository(db)
        self.interactions = SalesInteractionRepository(db)

    def _resolve_context(
        self,
        ws_ctx: WorkspaceContext | None,
        current_user: User,
    ) -> tuple[bool, bool, uuid.UUID | None]:
        """Returns (is_personal, is_manager, workspace_id)."""
        if ws_ctx is not None:
            return (
                ws_ctx.is_personal,
                ws_ctx.is_manager or current_user.role in UNRESTRICTED_ROLES,
                ws_ctx.workspace_id if not ws_ctx.is_personal else None,
            )
        return True, current_user.role in UNRESTRICTED_ROLES, None

    async def get_summary(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> CRMDashboardSummary:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            effective_owner = owner_id if current_user.role in UNRESTRICTED_ROLES else current_user.id
            ws_filter_lead = Lead.workspace_id.is_(None)
            ws_filter_acc = Account.workspace_id.is_(None)
            ws_filter_con = Contact.workspace_id.is_(None)
        else:
            effective_owner = owner_id if is_manager else current_user.id
            ws_filter_lead = (Lead.workspace_id == workspace_id)
            ws_filter_acc = (Account.workspace_id == workspace_id)
            ws_filter_con = (Contact.workspace_id == workspace_id)

        # Leads count
        lead_q = select(func.count(Lead.id)).where(ws_filter_lead)
        if effective_owner:
            lead_q = lead_q.where(or_(Lead.assigned_to == effective_owner, Lead.owner_id == effective_owner))
        total_leads = (await self.db.execute(lead_q)).scalar_one() or 0

        # Accounts count
        acc_q = select(func.count(Account.id)).where(ws_filter_acc)
        if effective_owner:
            acc_q = acc_q.where(Account.owner_id == effective_owner)
        total_accounts = (await self.db.execute(acc_q)).scalar_one() or 0

        # Contacts count
        con_q = select(func.count(Contact.id)).where(ws_filter_con)
        if effective_owner:
            con_q = con_q.where(Contact.owner_id == effective_owner)
        total_contacts = (await self.db.execute(con_q)).scalar_one() or 0

        # Opportunity metrics
        metrics = await self.opportunities.get_metrics(
            owner_id=effective_owner,
            workspace_id=workspace_id,
            is_personal=is_personal,
        )

        # Upcoming tasks
        upcoming_tasks_models = await self.tasks.list_upcoming(
            user_id=effective_owner,
            workspace_id=workspace_id,
            is_personal=is_personal,
            limit=6,
        )
        upcoming_tasks = [TaskListItem.model_validate(t) for t in upcoming_tasks_models]

        # Recent activities
        if not is_personal and workspace_id is not None:
            if is_manager:
                recent_interactions_models = await self.interactions.list_recent(
                    workspace_id=workspace_id,
                    is_personal=False,
                    limit=10,
                )
            else:
                recent_interactions_models = await self.interactions.list_recent(
                    workspace_id=workspace_id,
                    is_personal=False,
                    user_id=effective_owner,
                    limit=10,
                )
        elif effective_owner:
            user_lead_ids = select(Lead.id).where(or_(Lead.assigned_to == effective_owner, Lead.owner_id == effective_owner))
            user_opp_ids = select(Opportunity.id).where(Opportunity.owner_id == effective_owner)
            user_acc_ids = select(Account.id).where(Account.owner_id == effective_owner)
            user_con_ids = select(Contact.id).where(Contact.owner_id == effective_owner)

            act_query = (
                select(SalesInteraction)
                .where(
                    or_(
                        SalesInteraction.user_id == effective_owner,
                        SalesInteraction.lead_id.in_(user_lead_ids),
                        SalesInteraction.opportunity_id.in_(user_opp_ids),
                        SalesInteraction.account_id.in_(user_acc_ids),
                        SalesInteraction.contact_id.in_(user_con_ids),
                    )
                )
                .order_by(SalesInteraction.interaction_date.desc())
                .limit(10)
            )
            act_result = await self.db.execute(act_query)
            recent_interactions_models = list(act_result.scalars().all())
        else:
            recent_interactions_models = await self.interactions.list_recent(limit=10)

        recent_activities = [ActivityListItem.model_validate(a) for a in recent_interactions_models]

        return CRMDashboardSummary(
            total_leads=total_leads,
            total_accounts=total_accounts,
            total_contacts=total_contacts,
            open_opportunities_count=metrics["open_count"],
            pipeline_value=metrics["pipeline_value"],
            won_revenue=metrics["won_revenue"],
            lost_revenue=metrics["lost_revenue"],
            win_rate=metrics["win_rate"],
            upcoming_tasks=upcoming_tasks,
            recent_activities=recent_activities,
        )

    async def get_predictive_analytics(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> PredictiveAnalytics:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)
        effective_owner = owner_id if (is_manager or current_user.role in UNRESTRICTED_ROLES) else current_user.id

        all_deals = await self.opportunities.get_pipeline_deals(
            owner_id=effective_owner,
            workspace_id=workspace_id,
            is_personal=is_personal,
        )
        total_deals = len(all_deals)

        # Honest predictive analytics guard:
        if total_deals < 3:
            return PredictiveAnalytics(
                has_sufficient_data=False,
                data_points_count=total_deals,
                message="Insufficient historical opportunity data for reliable AI predictive analytics. Add more deals to generate forecasts.",
            )

        metrics = await self.opportunities.get_metrics(
            owner_id=effective_owner,
            workspace_id=workspace_id,
            is_personal=is_personal,
        )
        win_rate = metrics["win_rate"]

        # Calculate expected revenue based on actual probabilities or historical win rate
        expected_revenue = Decimal("0")
        high_potential = []
        at_risk = []

        for deal in all_deals:
            if not deal.is_closed and deal.amount:
                prob = (deal.probability if deal.probability is not None else 20) / 100.0
                expected_revenue += deal.amount * Decimal(str(prob))

                if (deal.probability or 0) >= 60 or deal.stage in (OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION):
                    high_potential.append(OpportunityListItem.model_validate(deal))
                elif (deal.probability or 0) <= 25 or deal.stage == OpportunityStage.NEW:
                    at_risk.append(OpportunityListItem.model_validate(deal))

        return PredictiveAnalytics(
            has_sufficient_data=True,
            data_points_count=total_deals,
            historical_win_rate=win_rate,
            expected_revenue_forecast=round(expected_revenue, 2),
            total_pipeline_value=metrics["pipeline_value"],
            high_potential_deals=high_potential[:5],
            at_risk_deals=at_risk[:5],
            monthly_trends=[
                {"month": "Pipeline", "value": float(metrics["pipeline_value"])},
                {"month": "Expected", "value": float(expected_revenue)},
                {"month": "Won", "value": float(metrics["won_revenue"])},
                {"month": "Lost", "value": float(metrics["lost_revenue"])},
            ],
        )
