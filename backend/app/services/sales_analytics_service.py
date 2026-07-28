"""
Sales Analytics service (Module 8: Dashboard & Sales Analytics).

Computes the live dashboard view directly from `leads` (always
up-to-date) and separately supports recording point-in-time snapshots
into `sales_analytics` (used for the trend lines — "+3.2% from last
month" — shown in the platform mockup, which need historical values a
live query can't provide on its own).
"""

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pipeline_enums import LeadStatus
from app.models.sales_analytics import SalesAnalytics
from app.models.user import User, UserRole
from app.repositories.sales_analytics_repository import SalesAnalyticsRepository
from app.schemas.dashboard import DashboardSummary, PipelineStageBreakdown

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


class SalesAnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.analytics = SalesAnalyticsRepository(db)

    def _effective_owner_id(self, current_user: User, requested_owner_id: uuid.UUID | None) -> uuid.UUID | None:
        """
        Restricted-role users always see only their own pipeline;
        unrestricted-role users may request any owner's pipeline (or the
        org-wide view, by passing no `owner_id`).
        """
        if current_user.role in UNRESTRICTED_ROLES:
            return requested_owner_id
        return current_user.id

    async def get_dashboard_summary(
        self, current_user: User, owner_id: uuid.UUID | None = None
    ) -> DashboardSummary:
        effective_owner_id = self._effective_owner_id(current_user, owner_id)

        breakdown = await self.analytics.pipeline_breakdown(owner_id=effective_owner_id)
        conversion_rate = await self.analytics.conversion_rate(owner_id=effective_owner_id)
        pipeline_value = await self.analytics.open_pipeline_value(owner_id=effective_owner_id)

        stages = [
            PipelineStageBreakdown(status=status, count=breakdown.get(status, 0))
            for status in LeadStatus
        ]

        return DashboardSummary(
            conversion_rate=Decimal(str(conversion_rate)),
            pipeline_value=pipeline_value,
            stages=stages,
            total_leads=sum(breakdown.values()),
        )

    async def record_snapshot(self, user_id: uuid.UUID) -> SalesAnalytics:
        """
        Persist the current live metrics as a dated snapshot — intended to
        be called on a schedule (e.g. nightly cron / background task) so
        the dashboard can later chart trends over time.
        """
        conversion_rate = await self.analytics.conversion_rate(owner_id=user_id)
        pipeline_value = await self.analytics.open_pipeline_value(owner_id=user_id)
        snapshot = await self.analytics.create_snapshot(
            user_id, Decimal(str(conversion_rate)), pipeline_value
        )
        await self.db.commit()
        return snapshot

    async def get_snapshot_history(self, user_id: uuid.UUID, limit: int = 30) -> list[SalesAnalytics]:
        return await self.analytics.list_history_for_user(user_id, limit=limit)
