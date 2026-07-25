"""
Global exception handlers.

Registered once, in `app.main.create_app()`, so that every route handler
in every module can simply `raise NotFoundError(...)` (or let a validation
error / unexpected exception propagate) and always get back a consistent
JSON error envelope, instead of each endpoint needing its own try/except.
"""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.common import ErrorDetail, ErrorResponse

logger = get_logger("app.errors")


def _error_json(status_code: int, error_code: str, message: str, details: object = None) -> JSONResponse:
    body = ErrorResponse(error=ErrorDetail(error_code=error_code, message=message, details=details))
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.warning(
            "Handled application exception: %s",
            exc.message,
            extra={"error_code": exc.error_code, "path": request.url.path},
        )
        return _error_json(exc.status_code, exc.error_code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _error_json(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "validation_error",
            "The request contains invalid data.",
            details=exc.errors(),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return _error_json(exc.status_code, "http_error", str(exc.detail))

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Catch-all safety net: never leak a stack trace or raw exception
        # message to the client for anything unexpected.
        logger.exception("Unhandled exception", extra={"path": request.url.path})
        return _error_json(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "internal_error",
            "An unexpected error occurred. Please try again later.",
        )
