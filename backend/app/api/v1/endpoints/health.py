"""
Health check endpoints.

Two distinct checks are exposed on purpose:

- `GET /health`     — liveness. "Is the process up and able to respond?"
                      Used by container orchestrators (Docker/Kubernetes)
                      to decide whether to restart the container. Must
                      NEVER depend on the database — a DB outage should
                      not cause the app container itself to be restarted.
- `GET /health/db`  — readiness/dependency check. "Can the app actually
                      serve traffic?" Used by load balancers / uptime
                      monitors to decide whether to route traffic here.
"""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app import __version__
from app.core.config import settings
from app.db.session import check_database_connection
from app.schemas.common import DependencyHealth, HealthStatus

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthStatus,
    summary="Liveness check",
)
async def health_check() -> HealthStatus:
    return HealthStatus(
        status="ok",
        environment=settings.ENVIRONMENT,
        version=__version__,
    )


@router.get(
    "/health/db",
    response_model=DependencyHealth,
    summary="Database readiness check",
)
async def health_check_db() -> JSONResponse | DependencyHealth:
    db_ok = await check_database_connection()
    if not db_ok:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=DependencyHealth(database="unavailable").model_dump(),
        )
    return DependencyHealth(database="ok")
