"""
CRMSyncLog ORM model.

Maps to the `CRM_Sync_Logs` entity in the ER diagram (sync_id, lead_id,
crm_platform, sync_status, timestamp). Each row is an immutable audit
record of one synchronization attempt with an external CRM (Salesforce,
HubSpot, etc.) — append-only, so it uses the diagram's own `timestamp`
column name.
"""

import uuid
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import UUIDPrimaryKeyMixin, generated_at_column
from app.models.pipeline_enums import SyncStatus


class CRMSyncLog(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "crm_sync_logs"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    crm_platform: Mapped[str] = mapped_column(String(100), nullable=False)
    sync_status: Mapped[SyncStatus] = mapped_column(
        Enum(
            SyncStatus,
            name="syncstatus",
            native_enum=True,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=False,
        default=SyncStatus.PENDING,
        server_default=SyncStatus.PENDING.value,
        index=True,
    )
    timestamp: Mapped[datetime] = generated_at_column()

    lead: Mapped["Lead"] = relationship("Lead", back_populates="crm_sync_logs")  # noqa: F821

    def __repr__(self) -> str:
        return f"<CRMSyncLog id={self.id} lead_id={self.lead_id} status={self.sync_status.value}>"
