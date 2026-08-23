"""
SalesAnalytics repository.

Covers both the `sales_analytics` snapshot table (point-in-time rows) and
the live aggregate queries the Dashboard module computes directly from
`leads` (pipeline breakdown, conversion rate, pipeline value) with workspace isolation.
"""

import uuid
from decimal import Decimal

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.models.pipeline_enums import LeadStatus
from app.models.sales_analytics import SalesAnalytics


class SalesAnalyticsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_snapshot(
        self, user_id: uuid.UUID, conversion_rate: Decimal, pipeline_value: Decimal
    ) -> SalesAnalytics:
        snapshot = SalesAnalytics(
            user_id=user_id, conversion_rate=conversion_rate, pipeline_value=pipeline_value
        )
        self.db.add(snapshot)
        await self.db.flush()
        await self.db.refresh(snapshot)
        return snapshot

    async def get_latest_for_user(self, user_id: uuid.UUID) -> SalesAnalytics | None:
        result = await self.db.execute(
            select(SalesAnalytics)
            .where(SalesAnalytics.user_id == user_id)
            .order_by(SalesAnalytics.generated_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_history_for_user(self, user_id: uuid.UUID, limit: int = 30) -> list[SalesAnalytics]:
        result = await self.db.execute(
            select(SalesAnalytics)
            .where(SalesAnalytics.user_id == user_id)
            .order_by(SalesAnalytics.generated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    def _build_lead_filters(
        self,
        *,
        owner_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
    ) -> list[ColumnElement[bool]]:
        filters: list[ColumnElement[bool]] = []
        if is_personal:
            filters.append(Lead.workspace_id.is_(None))
        elif workspace_id is not None:
            filters.append(Lead.workspace_id == workspace_id)

        if owner_id is not None:
            filters.append(or_(Lead.assigned_to == owner_id, Lead.owner_id == owner_id))

        return filters

    async def pipeline_breakdown(
        self,
        *,
        owner_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
    ) -> dict[LeadStatus, int]:
        """Count of leads per pipeline stage, scoped to workspace or personal area."""
        filters = self._build_lead_filters(
            owner_id=owner_id, workspace_id=workspace_id, is_personal=is_personal
        )
        query = select(Lead.lead_status, func.count()).group_by(Lead.lead_status)
        for cond in filters:
            query = query.where(cond)
        result = await self.db.execute(query)
        return {status: count for status, count in result.all()}

    async def conversion_rate(
        self,
        *,
        owner_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
    ) -> float:
        """Percentage of (non-open) leads that closed won, scoped to workspace or personal area."""
        filters = self._build_lead_filters(
            owner_id=owner_id, workspace_id=workspace_id, is_personal=is_personal
        )

        won_query = select(func.count()).select_from(Lead).where(Lead.lead_status == LeadStatus.CLOSED_WON)
        closed_query = select(func.count()).select_from(Lead).where(
            Lead.lead_status.in_([LeadStatus.CLOSED_WON, LeadStatus.CLOSED_LOST])
        )
        for cond in filters:
            won_query = won_query.where(cond)
            closed_query = closed_query.where(cond)

        closed_total = (await self.db.execute(closed_query)).scalar_one()
        won_total = (await self.db.execute(won_query)).scalar_one()
        if closed_total == 0:
            return 0.0
        return round((won_total / closed_total) * 100, 2)

    async def open_pipeline_value(
        self,
        *,
        owner_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
    ) -> Decimal:
        """Sum of `deal_value` across leads still open (not closed won/lost), scoped to workspace or personal area."""
        filters = self._build_lead_filters(
            owner_id=owner_id, workspace_id=workspace_id, is_personal=is_personal
        )
        query = select(func.coalesce(func.sum(Lead.deal_value), 0)).where(
            Lead.lead_status.notin_([LeadStatus.CLOSED_WON, LeadStatus.CLOSED_LOST])
        )
        for cond in filters:
            query = query.where(cond)
        result = await self.db.execute(query)
        return result.scalar_one()
