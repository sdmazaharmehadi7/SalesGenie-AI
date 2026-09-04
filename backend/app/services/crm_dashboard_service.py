"""CRM Dashboard service — metrics aggregation, KPI queries, and predictive calculations with workspace isolation."""

import uuid
from decimal import Decimal

from datetime import datetime, timezone

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
from app.schemas.crm_dashboard import (
    CRMDashboardSummary,
    LeadFollowUpRecommendation,
    PredictiveAnalytics,
)
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

        lead_recommendations = await self.get_lead_followup_recommendations(
            current_user=current_user,
            ws_ctx=ws_ctx,
            owner_id=effective_owner,
            limit=12,
        )

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
            lead_recommendations=lead_recommendations,
        )

    async def get_lead_followup_recommendations(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        owner_id: uuid.UUID | None = None,
        limit: int = 15,
    ) -> list[LeadFollowUpRecommendation]:
        """Calculates rule-based automated follow-up recommendations & next steps for leads

        driven by real CRM data, lead status changes, activity recency, and overdue follow-up tasks.
        """
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)
        effective_owner = owner_id if (is_manager or current_user.role in UNRESTRICTED_ROLES) else current_user.id

        if is_personal:
            ws_filter_lead = Lead.workspace_id.is_(None)
        else:
            ws_filter_lead = (Lead.workspace_id == workspace_id)

        lead_stmt = select(Lead).where(ws_filter_lead)
        if effective_owner and not is_manager and current_user.role not in UNRESTRICTED_ROLES:
            lead_stmt = lead_stmt.where(
                or_(
                    Lead.assigned_to == effective_owner,
                    Lead.owner_id == effective_owner,
                    Lead.created_by == effective_owner,
                )
            )

        lead_stmt = lead_stmt.order_by(Lead.updated_at.desc()).limit(100)
        leads_res = await self.db.execute(lead_stmt)
        leads = list(leads_res.scalars().all())

        if not leads:
            return []

        lead_ids = [l.id for l in leads]
        now = datetime.now(timezone.utc)

        # Active follow-up tasks for these leads
        tasks_stmt = (
            select(Task)
            .where(
                Task.lead_id.in_(lead_ids),
                Task.task_type == "follow_up",
                Task.is_completed.is_(False),
            )
            .order_by(Task.due_date.asc())
        )
        tasks_res = await self.db.execute(tasks_stmt)
        active_tasks = list(tasks_res.scalars().all())

        lead_tasks_map: dict[uuid.UUID, list[Task]] = {}
        for t in active_tasks:
            lead_tasks_map.setdefault(t.lead_id, []).append(t)

        # Recent sales interactions for these leads
        act_stmt = (
            select(SalesInteraction)
            .where(SalesInteraction.lead_id.in_(lead_ids))
            .order_by(SalesInteraction.interaction_date.desc())
        )
        act_res = await self.db.execute(act_stmt)
        all_interactions = list(act_res.scalars().all())

        lead_last_act_map: dict[uuid.UUID, SalesInteraction] = {}
        for act in all_interactions:
            if act.lead_id not in lead_last_act_map:
                lead_last_act_map[act.lead_id] = act

        recommendations: list[LeadFollowUpRecommendation] = []

        for lead in leads:
            lead_status_str = lead.lead_status.value if hasattr(lead.lead_status, "value") else str(lead.lead_status)
            lead_name = lead.contact_name or lead.company_name or "Prospect"
            company_name = lead.company_name or "Company"

            # Lead stage recency
            updated_at = lead.updated_at if (lead.updated_at and lead.updated_at.tzinfo) else (lead.updated_at.replace(tzinfo=timezone.utc) if lead.updated_at else now)
            days_in_state = max(0, (now - updated_at).days)

            # Last interaction
            last_act = lead_last_act_map.get(lead.id)
            last_act_date = None
            last_act_type = None
            days_since_act = days_in_state
            if last_act:
                act_date = last_act.interaction_date if last_act.interaction_date.tzinfo else last_act.interaction_date.replace(tzinfo=timezone.utc)
                last_act_date = act_date
                last_act_type = last_act.interaction_type.value if hasattr(last_act.interaction_type, "value") else str(last_act.interaction_type)
                days_since_act = max(0, (now - act_date).days)

            tasks_for_lead = lead_tasks_map.get(lead.id, [])

            # Check for overdue follow-up task
            overdue_task = None
            for t in tasks_for_lead:
                t_due = t.due_date if (t.due_date and t.due_date.tzinfo) else (t.due_date.replace(tzinfo=timezone.utc) if t.due_date else None)
                if t_due and t_due < now:
                    overdue_task = t
                    break

            # Rule 1: Overdue Follow-up (Urgency: Urgent)
            if overdue_task:
                t_due = overdue_task.due_date if overdue_task.due_date.tzinfo else overdue_task.due_date.replace(tzinfo=timezone.utc)
                days_overdue = max(1, (now - t_due).days)
                recommendations.append(
                    LeadFollowUpRecommendation(
                        id=f"rec-{lead.id}-overdue-{overdue_task.id}",
                        lead_id=lead.id,
                        lead_name=lead_name,
                        company_name=company_name,
                        lead_status=lead_status_str,
                        deal_value=lead.deal_value,
                        urgency="urgent",
                        trigger_type="overdue_followup",
                        title=f"Overdue Follow-up: {overdue_task.title}",
                        reason=f"Scheduled follow-up was due {days_overdue} day{'s' if days_overdue > 1 else ''} ago. Immediate re-contact required.",
                        suggested_action="complete_followup",
                        action_label="Complete Follow-up",
                        days_in_current_state=days_in_state,
                        last_interaction_date=last_act_date,
                        last_interaction_type=last_act_type,
                        existing_follow_up_id=overdue_task.id,
                        due_date=overdue_task.due_date,
                        assigned_to=lead.assigned_to or lead.owner_id,
                    )
                )
                continue

            # Don't recommend follow-up on closed deals
            if lead_status_str in ("closed_won", "closed_lost"):
                continue

            # Rule 2: Proposal Stage Progression (Urgency: High)
            if lead_status_str == "proposal":
                if days_since_act >= 2 or not tasks_for_lead:
                    recommendations.append(
                        LeadFollowUpRecommendation(
                            id=f"rec-{lead.id}-proposal",
                            lead_id=lead.id,
                            lead_name=lead_name,
                            company_name=company_name,
                            lead_status=lead_status_str,
                            deal_value=lead.deal_value,
                            urgency="high",
                            trigger_type="status_change",
                            title=f"Proposal Decision Review with {company_name}",
                            reason=f"Lead moved to Proposal stage ({days_in_state}d ago). Review commercial pricing and confirm evaluation timeline.",
                            suggested_action="schedule_followup",
                            action_label="Schedule Proposal Review",
                            days_in_current_state=days_in_state,
                            last_interaction_date=last_act_date,
                            last_interaction_type=last_act_type,
                            assigned_to=lead.assigned_to or lead.owner_id,
                        )
                    )
                    continue

            # Rule 3: Negotiation Stage Closing Action (Urgency: High)
            if lead_status_str == "negotiation":
                if days_since_act >= 2 or not tasks_for_lead:
                    recommendations.append(
                        LeadFollowUpRecommendation(
                            id=f"rec-{lead.id}-negotiation",
                            lead_id=lead.id,
                            lead_name=lead_name,
                            company_name=company_name,
                            lead_status=lead_status_str,
                            deal_value=lead.deal_value,
                            urgency="high",
                            trigger_type="status_change",
                            title=f"Closing & Final Contract Alignment",
                            reason=f"Active Negotiation in progress ({days_in_state}d). Address final blockers or terms to close the deal.",
                            suggested_action="schedule_meeting",
                            action_label="Schedule Closing Call",
                            days_in_current_state=days_in_state,
                            last_interaction_date=last_act_date,
                            last_interaction_type=last_act_type,
                            assigned_to=lead.assigned_to or lead.owner_id,
                        )
                    )
                    continue

            # Rule 4: Qualified Lead Ready for Pipeline Conversion (Urgency: Medium)
            if lead_status_str == "qualified":
                if not tasks_for_lead:
                    recommendations.append(
                        LeadFollowUpRecommendation(
                            id=f"rec-{lead.id}-qualified",
                            lead_id=lead.id,
                            lead_name=lead_name,
                            company_name=company_name,
                            lead_status=lead_status_str,
                            deal_value=lead.deal_value,
                            urgency="medium",
                            trigger_type="status_change",
                            title=f"Discovery Demo / Opportunity Conversion",
                            reason=f"Lead qualified ({days_in_state}d ago). Schedule discovery demo or convert to opportunity pipeline.",
                            suggested_action="schedule_meeting",
                            action_label="Schedule Discovery Demo",
                            days_in_current_state=days_in_state,
                            last_interaction_date=last_act_date,
                            last_interaction_type=last_act_type,
                            assigned_to=lead.assigned_to or lead.owner_id,
                        )
                    )
                    continue

            # Rule 5: New Uncontacted Lead (Urgency: High if >= 2d, else Medium)
            if lead_status_str == "new":
                if last_act is None:
                    urgency = "high" if days_in_state >= 2 else "medium"
                    recommendations.append(
                        LeadFollowUpRecommendation(
                            id=f"rec-{lead.id}-new-uncontacted",
                            lead_id=lead.id,
                            lead_name=lead_name,
                            company_name=company_name,
                            lead_status=lead_status_str,
                            deal_value=lead.deal_value,
                            urgency=urgency,
                            trigger_type="new_uncontacted",
                            title=f"Initial Outreach & Qualification",
                            reason=f"New inbound lead created {days_in_state} day{'s' if days_in_state != 1 else ''} ago with 0 touchpoints logged.",
                            suggested_action="log_call",
                            action_label="Initiate Outreach Call",
                            days_in_current_state=days_in_state,
                            last_interaction_date=None,
                            last_interaction_type=None,
                            assigned_to=lead.assigned_to or lead.owner_id,
                        )
                    )
                    continue

            # Rule 6: Stale Lead (No CRM touchpoint in 7+ days) (Urgency: Medium)
            if days_since_act >= 7 and not tasks_for_lead:
                recommendations.append(
                    LeadFollowUpRecommendation(
                        id=f"rec-{lead.id}-stale",
                        lead_id=lead.id,
                        lead_name=lead_name,
                        company_name=company_name,
                        lead_status=lead_status_str,
                        deal_value=lead.deal_value,
                        urgency="medium",
                        trigger_type="stale_lead",
                        title=f"Re-engagement Touchpoint: {company_name}",
                        reason=f"No CRM interaction logged in {days_since_act} days. Prospect risks cooling off.",
                        suggested_action="schedule_followup",
                        action_label="Schedule Re-engagement",
                        days_in_current_state=days_in_state,
                        last_interaction_date=last_act_date,
                        last_interaction_type=last_act_type,
                        assigned_to=lead.assigned_to or lead.owner_id,
                    )
                )
                continue

            # Rule 7: High Value Lead without Scheduled Follow-up (Urgency: High)
            if lead.deal_value and lead.deal_value >= Decimal("5000") and not tasks_for_lead:
                recommendations.append(
                    LeadFollowUpRecommendation(
                        id=f"rec-{lead.id}-high-value",
                        lead_id=lead.id,
                        lead_name=lead_name,
                        company_name=company_name,
                        lead_status=lead_status_str,
                        deal_value=lead.deal_value,
                        urgency="high",
                        trigger_type="missing_followup",
                        title=f"Secure Next Step on High-Value Lead (${lead.deal_value:,.0f})",
                        reason=f"High-value pipeline prospect has no upcoming follow-up scheduled.",
                        suggested_action="schedule_followup",
                        action_label="Schedule Follow-up",
                        days_in_current_state=days_in_state,
                        last_interaction_date=last_act_date,
                        last_interaction_type=last_act_type,
                        assigned_to=lead.assigned_to or lead.owner_id,
                    )
                )

        priority_map = {"urgent": 0, "high": 1, "medium": 2, "normal": 3}
        recommendations.sort(key=lambda r: (priority_map.get(r.urgency, 4), -r.days_in_current_state))
        return recommendations[:limit]

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
