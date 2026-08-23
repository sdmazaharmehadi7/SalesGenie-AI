"""Pydantic schemas for Manager Team Tracking & Performance dashboard."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field


class TrendMetric(BaseModel):
    value: float | int | Decimal | str
    previous_value: float | int | Decimal | str | None = None
    change_pct: float | None = None
    trend: Literal["up", "down", "neutral"] = "neutral"
    comparison_label: str = "vs previous period"


class TeamTrackingSummary(BaseModel):
    total_members: int = 0
    active_members: int = 0
    total_leads: int = 0
    deals_won: int = 0
    team_revenue: Decimal = Decimal(0)
    avg_conversion_rate: float = 0.0

    # Trend comparisons
    total_members_trend: TrendMetric | None = None
    active_members_trend: TrendMetric | None = None
    total_leads_trend: TrendMetric | None = None
    deals_won_trend: TrendMetric | None = None
    team_revenue_trend: TrendMetric | None = None
    conversion_rate_trend: TrendMetric | None = None


class PipelineStageBreakdown(BaseModel):
    stage: str
    count: int = 0
    value: Decimal = Decimal(0)


class MemberActivityCounts(BaseModel):
    emails: int = 0
    calls: int = 0
    meetings: int = 0
    follow_ups: int = 0
    notes: int = 0
    total: int = 0


class TeamMemberPerformance(BaseModel):
    user_id: uuid.UUID
    name: str
    email: str
    role: str
    joined_at: datetime | None = None
    status: Literal["active", "away", "offline"] = "active"
    performance_score: Literal["Excellent", "Good", "Needs Attention"] = "Good"

    assigned_leads: int = 0
    contacted: int = 0
    qualified: int = 0
    meetings: int = 0
    proposals: int = 0
    deals_won: int = 0
    deals_lost: int = 0
    revenue: Decimal = Decimal(0)
    conversion_rate: float = 0.0

    activity_counts: MemberActivityCounts = Field(default_factory=MemberActivityCounts)
    pipeline_breakdown: list[PipelineStageBreakdown] = Field(default_factory=list)


class TeamActivityItem(BaseModel):
    id: uuid.UUID
    activity_type: str
    title: str
    description: str | None = None
    lead_id: uuid.UUID | None = None
    lead_company: str | None = None
    user_id: uuid.UUID | None = None
    user_name: str | None = None
    created_at: datetime


class FollowUpAlert(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID | None = None
    lead_company: str
    contact_name: str | None = None
    assigned_to_id: uuid.UUID | None = None
    assigned_to_name: str
    last_contact: datetime | None = None
    next_follow_up: datetime | None = None
    priority: Literal["High", "Medium", "Low"] = "Medium"
    status: Literal["Overdue", "Due Today", "Upcoming"] = "Overdue"
    days_idle: int = 0


class AiInsightItem(BaseModel):
    type: Literal["top_performer", "needs_attention", "opportunity", "follow_up_risk"]
    title: str
    description: str
    metric_highlight: str | None = None
    member_id: uuid.UUID | None = None
    member_name: str | None = None


class TeamAiInsights(BaseModel):
    insights: list[AiInsightItem] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ChartBarItem(BaseModel):
    name: str
    user_id: uuid.UUID | None = None
    value: float | int | Decimal


class ActivityTimePoint(BaseModel):
    date: str
    calls: int = 0
    emails: int = 0
    meetings: int = 0
    total: int = 0


class TeamChartsData(BaseModel):
    revenue_by_member: list[ChartBarItem] = Field(default_factory=list)
    deals_won_by_member: list[ChartBarItem] = Field(default_factory=list)
    conversion_rate_by_member: list[ChartBarItem] = Field(default_factory=list)
    team_activity_over_time: list[ActivityTimePoint] = Field(default_factory=list)
    pipeline_distribution: list[PipelineStageBreakdown] = Field(default_factory=list)
