"""
OpenAI implementation of `AIProvider`.

Talks to the OpenAI Chat Completions API directly over HTTP via `httpx`
(no `openai` SDK dependency needed) and forces JSON-mode responses so
output can be parsed deterministically. This is the concrete node behind
the architecture diagram's "Large Language Model (Gemini/OpenAI)" box.
"""

import json
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import get_logger
from app.integrations.ai.base import AIProvider
from app.integrations.ai.prompts import (
    COMPANY_INSIGHT_SYSTEM_PROMPT,
    CONVERSATION_SUMMARY_SYSTEM_PROMPT,
    LEAD_SCORE_SYSTEM_PROMPT,
    OUTREACH_EMAIL_SYSTEM_PROMPT,
    build_company_insight_user_prompt,
    build_conversation_summary_user_prompt,
    build_lead_score_user_prompt,
    build_outreach_email_user_prompt,
)

logger = get_logger(__name__)


class OpenAIProvider(AIProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: int | None = None,
        max_retries: int | None = None,
    ) -> None:
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
        self.timeout_seconds = timeout_seconds or settings.OPENAI_TIMEOUT_SECONDS
        self.max_retries = max_retries if max_retries is not None else settings.OPENAI_MAX_RETRIES

        if not self.api_key:
            raise ServiceUnavailableError(
                "AI_PROVIDER is set to 'openai' but OPENAI_API_KEY is not configured.",
                error_code="ai_not_configured",
            )

    async def _chat_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """
        Call the Chat Completions endpoint with JSON-mode enabled, retrying
        transient failures (timeouts, 5xx) up to `max_retries` times.
        """
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.4,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        last_error: Exception | None = None
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            for attempt in range(self.max_retries + 1):
                try:
                    response = await client.post(
                        f"{self.base_url}/chat/completions", json=payload, headers=headers
                    )
                    response.raise_for_status()
                    body = response.json()
                    content = body["choices"][0]["message"]["content"]
                    return json.loads(content)
                except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError) as exc:
                    last_error = exc
                    logger.warning(
                        "OpenAI call failed (attempt %s/%s): %s",
                        attempt + 1,
                        self.max_retries + 1,
                        exc,
                    )

        logger.error("OpenAI call failed after retries: %s", last_error)
        raise ServiceUnavailableError(
            "The AI service is temporarily unavailable. Please try again shortly.",
            error_code="ai_provider_error",
        )

    async def generate_company_insight(
        self, *, company_name: str, industry: str | None, contact_name: str | None
    ) -> dict[str, Any]:
        return await self._chat_json(
            COMPANY_INSIGHT_SYSTEM_PROMPT,
            build_company_insight_user_prompt(company_name, industry, contact_name),
        )

    async def generate_lead_score(
        self, *, company_name: str, industry: str | None, insight: dict[str, Any] | None
    ) -> dict[str, Any]:
        result = await self._chat_json(
            LEAD_SCORE_SYSTEM_PROMPT,
            build_lead_score_user_prompt(company_name, industry, insight),
        )
        # Defensive clamping: never trust an LLM to perfectly respect a
        # numeric range instruction.
        result["lead_score"] = max(0, min(100, int(result.get("lead_score", 0))))
        result["conversion_probability"] = max(
            0.0, min(1.0, float(result.get("conversion_probability", 0.0)))
        )
        return result

    async def generate_outreach_email(
        self,
        *,
        company_name: str,
        contact_name: str | None,
        industry: str | None,
        insight: dict[str, Any] | None,
    ) -> dict[str, Any]:
        return await self._chat_json(
            OUTREACH_EMAIL_SYSTEM_PROMPT,
            build_outreach_email_user_prompt(company_name, contact_name, industry, insight),
        )

    async def summarize_conversation(self, *, transcript: str) -> dict[str, Any]:
        result = await self._chat_json(
            CONVERSATION_SUMMARY_SYSTEM_PROMPT,
            build_conversation_summary_user_prompt(transcript),
        )
        result.setdefault("action_items", [])
        return result
