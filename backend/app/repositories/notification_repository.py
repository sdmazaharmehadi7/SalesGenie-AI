"""
Notification repository.

Handles DB operations for Notifications and NotificationPreferences with
strict isolation by user_id and workspace_id.
"""

import uuid
from typing import Sequence

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationPreference
from app.schemas.notification import NotificationCreate, NotificationPreferenceUpdate


class NotificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, notif_in: NotificationCreate) -> Notification | None:
        """
        Creates a notification. If an idempotency_key is provided and already exists,
        returns the existing notification to prevent duplicate notifications.
        """
        if notif_in.idempotency_key:
            existing = await self.get_by_idempotency_key(notif_in.idempotency_key)
            if existing is not None:
                return existing

        notification = Notification(
            user_id=notif_in.user_id,
            workspace_id=notif_in.workspace_id,
            type=notif_in.type,
            title=notif_in.title,
            message=notif_in.message,
            entity_type=notif_in.entity_type,
            entity_id=notif_in.entity_id,
            data=notif_in.data,
            idempotency_key=notif_in.idempotency_key,
            is_read=False,
        )
        self.db.add(notification)
        await self.db.flush()
        await self.db.refresh(notification)
        return notification

    async def get_by_id(self, notification_id: uuid.UUID) -> Notification | None:
        return await self.db.get(Notification, notification_id)

    async def get_by_idempotency_key(self, idempotency_key: str) -> Notification | None:
        stmt = select(Notification).where(Notification.idempotency_key == idempotency_key)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_notifications(
        self,
        *,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
        is_read: bool | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Notification], int]:
        """
        Lists notifications for a user within a workspace context (or personal area).
        Enforces strict user and workspace scoping.
        """
        stmt = select(Notification).where(Notification.user_id == user_id)

        if is_personal or workspace_id is None:
            stmt = stmt.where(Notification.workspace_id.is_(None))
        else:
            stmt = stmt.where(
                (Notification.workspace_id == workspace_id)
                | (
                    Notification.workspace_id.is_(None)
                    & (Notification.type == "workspace_invitation")
                )
            )

        if is_read is not None:
            stmt = stmt.where(Notification.is_read == is_read)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = stmt.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        items = result.scalars().all()

        return items, total

    async def count_unread(
        self,
        *,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
    ) -> int:
        stmt = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False,  # noqa: E712
        )
        if is_personal or workspace_id is None:
            stmt = stmt.where(Notification.workspace_id.is_(None))
        else:
            stmt = stmt.where(
                (Notification.workspace_id == workspace_id)
                | (
                    Notification.workspace_id.is_(None)
                    & (Notification.type == "workspace_invitation")
                )
            )

        return (await self.db.execute(stmt)).scalar_one()

    async def mark_as_read(self, notification: Notification) -> Notification:
        notification.is_read = True
        await self.db.flush()
        await self.db.refresh(notification)
        return notification

    async def mark_entity_notifications_read(
        self,
        *,
        user_id: uuid.UUID,
        entity_type: str,
        entity_id: uuid.UUID,
    ) -> int:
        stmt = (
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.entity_type == entity_type,
                Notification.entity_id == entity_id,
                Notification.is_read == False,  # noqa: E712
            )
            .values(is_read=True)
        )
        result = await self.db.execute(stmt)
        return result.rowcount

    async def mark_all_read(
        self,
        *,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID | None = None,
        is_personal: bool = False,
    ) -> int:
        stmt = update(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == False,  # noqa: E712
        )
        if is_personal or workspace_id is None:
            stmt = stmt.where(Notification.workspace_id.is_(None))
        else:
            stmt = stmt.where(
                (Notification.workspace_id == workspace_id)
                | (
                    Notification.workspace_id.is_(None)
                    & (Notification.type == "workspace_invitation")
                )
            )

        stmt = stmt.values(is_read=True)
        result = await self.db.execute(stmt)
        return result.rowcount

    async def get_or_create_preferences(self, user_id: uuid.UUID) -> NotificationPreference:
        stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        result = await self.db.execute(stmt)
        pref = result.scalar_one_or_none()
        if pref is None:
            pref = NotificationPreference(user_id=user_id)
            self.db.add(pref)
            await self.db.flush()
            await self.db.refresh(pref)
        return pref

    async def update_preferences(
        self, user_id: uuid.UUID, update_in: NotificationPreferenceUpdate
    ) -> NotificationPreference:
        pref = await self.get_or_create_preferences(user_id)
        for field, value in update_in.model_dump(exclude_unset=True).items():
            setattr(pref, field, value)
        await self.db.flush()
        await self.db.refresh(pref)
        return pref
