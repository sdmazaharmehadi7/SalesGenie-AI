"""
Sales Analytics service (Module 8: Dashboard & Sales Analytics).

Computes the live dashboard view directly from `leads` (always
up-to-date) and separately supports recording point-in-time snapshots
into `sales_analytics` with workspace context isolation.
"""

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
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

    async def get_dashboard_summary(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> DashboardSummary:
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)

        if is_personal:
            # Personal area: user sees only their own leads (unless admin override)
            effective_owner_id = (
                owner_id if current_user.role in UNRESTRICTED_ROLES else current_user.id
            )
            breakdown = await self.analytics.pipeline_breakdown(
                owner_id=effective_owner_id,
                workspace_id=None,
                is_personal=True,
            )
            conversion_rate = await self.analytics.conversion_rate(
                owner_id=effective_owner_id,
                workspace_id=None,
                is_personal=True,
            )
            pipeline_value = await self.analytics.open_pipeline_value(
                owner_id=effective_owner_id,
                workspace_id=None,
                is_personal=True,
            )
        else:
            # Workspace context:
            # Manager: workspace-wide metrics (or filtered by owner_id if passed)
            # Team Member: authorized metrics (only their assigned leads)
            effective_owner_id = owner_id if is_manager else current_user.id
            breakdown = await self.analytics.pipeline_breakdown(
                owner_id=effective_owner_id,
                workspace_id=workspace_id,
                is_personal=False,
            )
            conversion_rate = await self.analytics.conversion_rate(
                owner_id=effective_owner_id,
                workspace_id=workspace_id,
                is_personal=False,
            )
            pipeline_value = await self.analytics.open_pipeline_value(
                owner_id=effective_owner_id,
                workspace_id=workspace_id,
                is_personal=False,
            )

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

    async def record_snapshot(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> SalesAnalytics:
        """
        Persist current live metrics as a dated snapshot.
        """
        is_personal, is_manager, workspace_id = self._resolve_context(ws_ctx, current_user)
        effective_owner = None if (not is_personal and is_manager) else current_user.id

        conversion_rate = await self.analytics.conversion_rate(
            owner_id=effective_owner,
            workspace_id=workspace_id,
            is_personal=is_personal,
        )
        pipeline_value = await self.analytics.open_pipeline_value(
            owner_id=effective_owner,
            workspace_id=workspace_id,
            is_personal=is_personal,
        )
        snapshot = await self.analytics.create_snapshot(
            current_user.id, Decimal(str(conversion_rate)), pipeline_value
        )
        await self.db.commit()
        return snapshot

    async def get_snapshot_history(
        self,
        current_user: User,
        limit: int = 30,
    ) -> list[SalesAnalytics]:
        return await self.analytics.list_history_for_user(current_user.id, limit=limit)
