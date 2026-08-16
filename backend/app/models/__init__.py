"""
ORM models package.

IMPORTANT for Alembic autogenerate: every concrete model module MUST be
imported here so that `Base.metadata` is fully populated before
`alembic revision --autogenerate` inspects it. This is also the single
place import order is resolved for models that reference each other by
string name in `relationship(...)` (e.g. `Lead.owner` -> `"User"`).

Import order matters: Account must come before Contact/Lead (which FK-reference it),
and Contact/Account before Opportunity, and Opportunity before Task.
"""

from app.db.base_class import Base  # noqa: F401
from app.models.user import User, UserRole  # noqa: F401
from app.models.pipeline_enums import (  # noqa: F401
    CampaignStatus,
    InteractionType,
    LeadStatus,
    OpportunityStage,
    SyncStatus,
    TaskPriority,
)
from app.models.account import Account  # noqa: F401
from app.models.lead import Lead  # noqa: F401
from app.models.contact import Contact  # noqa: F401
from app.models.opportunity import Opportunity  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.company_insight import CompanyInsight  # noqa: F401
from app.models.lead_score import LeadScore  # noqa: F401
from app.models.outreach_campaign import OutreachCampaign  # noqa: F401
from app.models.sales_interaction import SalesInteraction  # noqa: F401
from app.models.crm_sync_log import CRMSyncLog  # noqa: F401
from app.models.sales_analytics import SalesAnalytics  # noqa: F401

__all__ = [
    "Base",
    "User",
    "UserRole",
    "LeadStatus",
    "CampaignStatus",
    "InteractionType",
    "SyncStatus",
    "OpportunityStage",
    "TaskPriority",
    "Account",
    "Lead",
    "Contact",
    "Opportunity",
    "Task",
    "CompanyInsight",
    "LeadScore",
    "OutreachCampaign",
    "SalesInteraction",
    "CRMSyncLog",
    "SalesAnalytics",
]
