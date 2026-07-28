"""
Application entry point.

Run locally with:
    uvicorn app.main:app --reload

The `create_app()` factory pattern (rather than a bare module-level `app`)
keeps startup wiring in one place and makes it trivial to spin up isolated
app instances in tests (e.g. with overridden settings/dependencies).
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.error_handlers import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.db.session import engine
from app.middleware.logging_middleware import RequestLoggingMiddleware

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application startup/shutdown hook.

    Startup: configure logging before anything else runs, so even import-
    time issues in later modules log correctly.
    Shutdown: dispose of the database connection pool cleanly.
    """
    configure_logging()
    logger.info(
        "Starting %s (env=%s, version=%s)",
        settings.PROJECT_NAME,
        settings.ENVIRONMENT,
        __version__,
    )
    yield
    logger.info("Shutting down %s", settings.PROJECT_NAME)
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=__version__,
        description="AI Sales Assistant & Lead Intelligence Platform API",
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{settings.API_V1_PREFIX}/docs",
        redoc_url=f"{settings.API_V1_PREFIX}/redoc",
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

    # Order matters: middlewares run outside-in on the request, inside-out
    # on the response. CORS should wrap everything so its headers are
    # applied even on error responses produced by other middleware.
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Request-ID"],
        )
    app.add_middleware(RequestLoggingMiddleware)

    register_exception_handlers(app)

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
