"""CRM Dashboard service — metrics aggregation, KPI queries, and predictive calculations."""

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.pipeline_enums import OpportunityStage
from app.models.task import Task
from app.models.user import User
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.sales_interaction_repository import SalesInteractionRepository
from app.repositories.task_repository import TaskRepository
from app.schemas.crm_dashboard import CRMDashboardSummary, PredictiveAnalytics
from app.schemas.opportunity import OpportunityListItem
from app.schemas.sales_interaction import ActivityListItem
from app.schemas.task import TaskListItem


class CRMDashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.opportunities = OpportunityRepository(db)
        self.tasks = TaskRepository(db)
        self.interactions = SalesInteractionRepository(db)

    async def get_summary(
        self,
        current_user: User,
        owner_id: uuid.UUID | None = None,
    ) -> CRMDashboardSummary:
        # Leads count
        lead_q = select(func.count(Lead.id))
        if owner_id:
            lead_q = lead_q.where(Lead.owner_id == owner_id)
        total_leads = (await self.db.execute(lead_q)).scalar_one() or 0

        # Accounts count
        acc_q = select(func.count(Account.id))
        if owner_id:
            acc_q = acc_q.where(Account.owner_id == owner_id)
        total_accounts = (await self.db.execute(acc_q)).scalar_one() or 0

        # Contacts count
        con_q = select(func.count(Contact.id))
        if owner_id:
            con_q = con_q.where(Contact.owner_id == owner_id)
        total_contacts = (await self.db.execute(con_q)).scalar_one() or 0

        # Opportunity metrics
        metrics = await self.opportunities.get_metrics(owner_id=owner_id)

        # Upcoming tasks
        upcoming_tasks_models = await self.tasks.list_upcoming(assigned_to=owner_id, limit=6)
        upcoming_tasks = [TaskListItem.model_validate(t) for t in upcoming_tasks_models]

        # Recent activities
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
        owner_id: uuid.UUID | None = None,
    ) -> PredictiveAnalytics:
        all_deals = await self.opportunities.get_pipeline_deals(owner_id=owner_id)
        total_deals = len(all_deals)

        # Honest predictive analytics guard:
        if total_deals < 3:
            return PredictiveAnalytics(
                has_sufficient_data=False,
                data_points_count=total_deals,
                message="Insufficient historical opportunity data for reliable AI predictive analytics. Add more deals to generate forecasts.",
            )

        metrics = await self.opportunities.get_metrics(owner_id=owner_id)
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

