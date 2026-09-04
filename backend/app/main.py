"""
main.py — AI-Powered Sales Forecasting Platform Using Predictive Analytics FastAPI Application Entry Point
=========================================================
Creates and configures the FastAPI application instance.

Uses the `create_app()` factory pattern to keep startup wiring in one place,
supporting lifespan context management for database cleanup and logging initialization.

Running locally:
    uvicorn app.main:app --reload --port 8000
"""

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.ai.routes import router as ai_router
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.error_handlers import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.db.session import engine
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.services.notification_scheduler_service import run_notification_scheduler_loop

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application startup/shutdown hook.

    Startup: configure logging and launch periodic notification reminder scheduler.
    Shutdown: cancel background scheduler cleanly and dispose database pool.
    """
    configure_logging()
    logger.info(
        "Starting %s (env=%s, version=%s)",
        settings.PROJECT_NAME,
        settings.ENVIRONMENT,
        __version__,
    )
    scheduler_task = asyncio.create_task(run_notification_scheduler_loop(interval_seconds=60))
    try:
        yield
    finally:
        logger.info("Shutting down %s", settings.PROJECT_NAME)
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass
        await engine.dispose()



def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=__version__,
        description=(
            "Production-ready AI-powered B2B sales assistant API. "
            "Provides modular endpoints to generate outreach emails, summarize conversations, "
            "suggest follow-ups, score leads, and handle sales objections."
        ),
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{settings.API_V1_PREFIX}/docs",
        redoc_url=f"{settings.API_V1_PREFIX}/redoc",
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

    # CORS Middleware configuration
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Request-ID"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.add_middleware(RequestLoggingMiddleware)

    register_exception_handlers(app)

    # Register API v1 aggregated routes
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # Register direct AI routes (/api/chat, /api/email, etc. for frontend compatibility)
    app.include_router(ai_router)

    return app


app = create_app()


@app.get(
    "/health",
    tags=["Health"],
    summary="Health check",
    description="Returns a simple status payload to confirm the API is running.",
)
async def health_check() -> dict:
    return {"status": "ok", "service": settings.PROJECT_NAME}


logger.info("%s application started.", settings.PROJECT_NAME)
