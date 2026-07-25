"""
Top-level aggregator for all `/api/v1` routes.

Each feature module contributes its own `APIRouter` (e.g.
`app/api/v1/endpoints/leads.py` in Module 3) and is included here with an
explicit `prefix` and `tags`. Module 1 only wires up `health`.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health

api_router = APIRouter()

api_router.include_router(health.router)

# Future modules will add lines like:
# from app.api.v1.endpoints import auth, leads
# api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
# api_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
