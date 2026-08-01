"""
Top-level aggregator for all `/api/v1` routes.

Each feature module contributes its own `APIRouter` and is included here
with an explicit `prefix` and `tags`. `leads`, `company_insights`,
`lead_scores`, `outreach`, `conversations`, and `crm` all share the
`/leads` prefix (each contributing sub-paths like `/leads/{lead_id}/insights`)
since every one of those resources is scoped to a lead.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    company_insights,
    conversations,
    crm,
    dashboard,
    health,
    lead_scores,
    leads,
    outreach,
    users,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
api_router.include_router(company_insights.router, prefix="/leads", tags=["Company Intelligence"])
api_router.include_router(lead_scores.router, prefix="/leads", tags=["Lead Scoring"])
api_router.include_router(outreach.router, prefix="/leads", tags=["Outreach"])
api_router.include_router(conversations.router, prefix="/leads", tags=["Conversations"])
api_router.include_router(crm.router, prefix="/leads", tags=["CRM Integration"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
