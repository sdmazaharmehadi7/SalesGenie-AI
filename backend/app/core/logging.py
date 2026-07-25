"""
Application-wide logging configuration.

Provides a single `configure_logging()` entry point called once at app
startup. Supports plain human-readable logs (local dev) and structured
JSON logs (staging/production, so log aggregators like CloudWatch/ELK can
parse fields directly).
"""

import logging
import sys
from typing import Any

from app.core.config import settings

_LOG_FORMAT_PLAIN = (
    "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)


class JSONLogFormatter(logging.Formatter):
    """Minimal dependency-free JSON log formatter."""

    def format(self, record: logging.LogRecord) -> str:
        import json

        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        # Allow ad-hoc structured fields via `logger.info(msg, extra={...})`
        reserved = set(vars(logging.makeLogRecord({})).keys()) | {"message"}
        for key, value in vars(record).items():
            if key not in reserved and not key.startswith("_"):
                payload[key] = value

        return json.dumps(payload, default=str)


def configure_logging() -> None:
    """Configure the root logger once, at application startup."""
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL.upper())

    # Avoid duplicate handlers if configure_logging() is called more than
    # once (e.g. in tests that re-import the app).
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    if settings.LOG_JSON:
        handler.setFormatter(JSONLogFormatter())
    else:
        handler.setFormatter(logging.Formatter(_LOG_FORMAT_PLAIN))

    root_logger.addHandler(handler)

    # Tame noisy third-party loggers.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.DB_ECHO else logging.WARNING
    )


def get_logger(name: str) -> logging.Logger:
    """Convenience factory so modules do `logger = get_logger(__name__)`."""
    return logging.getLogger(name)
