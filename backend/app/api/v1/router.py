"""
Top-level aggregator for all `/api/v1` routes.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    accounts,
    activities,
    auth,
    company_insights,
    contacts,
    conversations,
    crm,
    crm_dashboard,
    dashboard,
    email,
    follow_ups,
    health,
    lead_scores,
    leads,
    notifications,
    opportunities,
    outreach,
    tasks,
    team_tracking,
    users,
    workspaces,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
api_router.include_router(company_insights.router, prefix="/leads", tags=["Company Intelligence"])
api_router.include_router(lead_scores.router, prefix="/leads", tags=["Lead Scoring"])
api_router.include_router(outreach.router, prefix="/leads", tags=["Outreach"])
api_router.include_router(conversations.router, prefix="/leads", tags=["Conversations"])
api_router.include_router(crm.router, prefix="/leads", tags=["CRM Integration"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

# New CRM Routes
api_router.include_router(crm_dashboard.router, prefix="/crm", tags=["CRM Dashboard & Analytics"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])
api_router.include_router(opportunities.router, prefix="/opportunities", tags=["Opportunities & Deals"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(follow_ups.router, prefix="/follow-ups", tags=["Follow-Ups"])
api_router.include_router(activities.router, prefix="/activities", tags=["Activities & Timeline"])
api_router.include_router(email.router, prefix="/email", tags=["Email"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(team_tracking.router, prefix="/team-tracking", tags=["Team Tracking & Performance"])
