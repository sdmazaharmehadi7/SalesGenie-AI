"""Pydantic v2 schemas for the CRM Dashboard & Predictive Analytics."""

from decimal import Decimal
from typing import Any

from pydantic import BaseModel

from app.schemas.opportunity import OpportunityListItem
from app.schemas.sales_interaction import ActivityListItem
from app.schemas.task import TaskListItem


import uuid
from datetime import datetime

class LeadFollowUpRecommendation(BaseModel):
    id: str
    lead_id: uuid.UUID
    lead_name: str
    company_name: str
    lead_status: str
    deal_value: Decimal | None = None
    urgency: str  # "urgent", "high", "medium", "normal"
    trigger_type: str  # "overdue_followup", "status_change", "stale_lead", "missing_followup", "new_uncontacted"
    title: str
    reason: str
    suggested_action: str  # "schedule_followup", "log_call", "schedule_meeting", "create_opportunity", "send_email"
    action_label: str
    days_in_current_state: int
    last_interaction_date: datetime | None = None
    last_interaction_type: str | None = None
    existing_follow_up_id: uuid.UUID | None = None
    due_date: datetime | None = None
    assigned_to: uuid.UUID | None = None


class CRMDashboardSummary(BaseModel):
    total_leads: int
    total_accounts: int
    total_contacts: int
    open_opportunities_count: int
    pipeline_value: Decimal
    won_revenue: Decimal
    lost_revenue: Decimal
    win_rate: float
    upcoming_tasks: list[TaskListItem]
    recent_activities: list[ActivityListItem]
    lead_recommendations: list[LeadFollowUpRecommendation] = []


class OpportunityRiskAnalysis(BaseModel):
    opportunity_id: str
    deal_name: str
    risk_level: str  # Low, Medium, High, Critical
    risk_factors: list[str]
    recommendations: list[str]
    next_best_action: str
    conversion_probability: int


class PredictiveAnalytics(BaseModel):
    has_sufficient_data: bool
    data_points_count: int
    message: str | None = None
    historical_win_rate: float | None = None
    expected_revenue_forecast: Decimal | None = None
    total_pipeline_value: Decimal | None = None
    high_potential_deals: list[OpportunityListItem] = []
    at_risk_deals: list[OpportunityListItem] = []
    monthly_trends: list[dict[str, Any]] = []
