"""
main.py — SalesGenie AI FastAPI Application Entry Point
=========================================================
Creates and configures the FastAPI application instance.

All routers are registered here. Business logic stays in the respective
service modules; this file is purely wiring.

Running locally:
    uvicorn app.main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Router imports — add new routers here as the project grows.
# ---------------------------------------------------------------------------
from app.ai.routes import router as ai_router

# ---------------------------------------------------------------------------
# Logging — basic config so log output is human-readable during development.
# In production, replace with a structured logging setup (e.g. structlog).
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SalesGenie AI",
    description=(
        "AI-powered B2B sales assistant API. "
        "Helps generate outreach emails, summarise conversations, "
        "suggest follow-ups, score leads, and handle objections."
    ),
    version="1.0.0",
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc UI
    openapi_url="/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — adjust origins before deploying to production.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Replace with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Router registration
# — Add new routers below this line, following the same pattern.
# ---------------------------------------------------------------------------

# AI assistant endpoints  →  /api/ai/*
app.include_router(ai_router)


# ---------------------------------------------------------------------------
# Health-check endpoint — useful for load balancers and deployment checks.
# ---------------------------------------------------------------------------
@app.get(
    "/health",
    tags=["Health"],
    summary="Health check",
    description="Returns a simple status payload to confirm the API is running.",
)
async def health_check() -> dict:
    return {"status": "ok", "service": "SalesGenie AI"}


logger.info("SalesGenie AI application started.")
