"""
Enums shared across the lead-pipeline models.

Kept in one module (rather than inline in each model file) so that
services/schemas that need several of them (e.g. the dashboard analytics
service, which reports on lead status AND campaign status together) have
a single import, and so Alembic migrations that touch multiple enums can
reference one source of truth.
"""

import enum


class LeadStatus(str, enum.Enum):
    """Matches the pipeline stages shown in the Sales Analytics dashboard."""

    NEW = "new"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class CampaignStatus(str, enum.Enum):
    """Lifecycle of an AI-generated outreach email/campaign."""

    DRAFT = "draft"
    SENT = "sent"
    OPENED = "opened"
    REPLIED = "replied"
    BOUNCED = "bounced"


class InteractionType(str, enum.Enum):
    """Type of a logged sales interaction/conversation."""

    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    DEMO = "demo"
    OTHER = "other"
    NOTE = "note"
    FOLLOW_UP = "follow_up"
    STAGE_CHANGE = "stage_change"


class SyncStatus(str, enum.Enum):
    """Result of a single CRM synchronization attempt."""

    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"


class OpportunityStage(str, enum.Enum):
    """Salesforce-style opportunity pipeline stages (New → Qualified → Demo → Proposal → Negotiation → Won/Lost)."""

    NEW = "new"
    QUALIFIED = "qualified"
    DEMO = "demo"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class TaskPriority(str, enum.Enum):
    """Priority level for CRM tasks."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
