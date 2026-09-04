"""
Custom exception hierarchy for the application.

Raising a specific `AppException` subclass from services/repositories lets
the global exception handlers (registered in `app.main`) translate it into
a consistent JSON error response, without every route handler needing its
own try/except boilerplate.
"""

from typing import Any


class AppException(Exception):
    """Base class for all application-raised (as opposed to framework) errors."""

    status_code: int = 500
    error_code: str = "internal_error"
    message: str = "An unexpected error occurred."

    def __init__(
        self,
        message: str | None = None,
        *,
        error_code: str | None = None,
        details: Any = None,
    ) -> None:
        self.message = message or self.message
        self.error_code = error_code or self.error_code
        self.details = details
        super().__init__(self.message)


class NotFoundError(AppException):
    status_code = 404
    error_code = "not_found"
    message = "The requested resource was not found."


class ConflictError(AppException):
    status_code = 409
    error_code = "conflict"
    message = "The request could not be completed due to a conflict."


class ValidationAppError(AppException):
    status_code = 422
    error_code = "validation_error"
    message = "The provided data is invalid."


class BadRequestError(AppException):
    status_code = 400
    error_code = "bad_request"
    message = "The request was invalid."


class UnauthorizedError(AppException):
    status_code = 401
    error_code = "unauthorized"
    message = "Authentication is required or has failed."


class ForbiddenError(AppException):
    status_code = 403
    error_code = "forbidden"
    message = "You do not have permission to perform this action."


class ServiceUnavailableError(AppException):
    status_code = 503
    error_code = "service_unavailable"
    message = "A dependent service is currently unavailable."
