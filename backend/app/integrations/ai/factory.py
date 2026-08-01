"""Factory for the configured `AIProvider` implementation."""

from functools import lru_cache

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.integrations.ai.base import AIProvider
from app.integrations.ai.gemini_client import GeminiProvider
from app.integrations.ai.mock_client import MockAIProvider
from app.integrations.ai.openai_client import OpenAIProvider


@lru_cache
def get_ai_provider() -> AIProvider:
    """
    Cached factory — the provider is stateless aside from a reused
    `httpx` client per-call, so one instance per process is safe and
    avoids re-validating configuration (e.g. `OPENAI_API_KEY` presence)
    on every request.
    """
    if settings.AI_PROVIDER == "mock":
        return MockAIProvider()  # type: ignore[return-value]
    if settings.AI_PROVIDER == "openai":
        return OpenAIProvider()
    if settings.AI_PROVIDER == "gemini":
        return GeminiProvider()
    raise ServiceUnavailableError(
        f"Unknown AI_PROVIDER '{settings.AI_PROVIDER}'. Expected 'mock', 'openai', or 'gemini'.",
        error_code="ai_misconfigured",
    )
