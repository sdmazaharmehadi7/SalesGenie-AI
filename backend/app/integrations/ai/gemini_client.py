"""
Google Gemini implementation of `AIProvider`.

Uses the `google-generativeai` SDK to call the Gemini API and returns
JSON-structured responses matching the expected Pydantic schemas.
This is the concrete Gemini node behind the architecture diagram's
\"Large Language Model (Gemini/OpenAI)\" box.
"""

import json
from typing import Any

import google.generativeai as genai

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


class GeminiProvider(AIProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model or settings.GEMINI_MODEL

        if not self.api_key:
            raise ServiceUnavailableError(
                "AI_PROVIDER is set to 'gemini' but GEMINI_API_KEY is not configured.",
                error_code="ai_not_configured",
            )

        genai.configure(api_key=self.api_key)
        self._model = genai.GenerativeModel(
            model_name=self.model_name,
            generation_config=genai.types.GenerationConfig(
                temperature=0.4,
                response_mime_type="application/json",
            ),
        )

    async def _generate_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """
        Call the Gemini API with JSON-mode enabled.
        The system prompt and user prompt are combined into a single message
        since Gemini's GenerativeModel accepts a system_instruction separately.
        """
        try:
            # Recreate model with system instruction for this call
            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.4,
                    response_mime_type="application/json",
                ),
            )
            response = model.generate_content(user_prompt)
            return json.loads(response.text)
        except json.JSONDecodeError as exc:
            logger.error("Gemini returned non-JSON response: %s", exc)
            raise ServiceUnavailableError(
                "The AI service returned an unexpected response. Please try again shortly.",
                error_code="ai_provider_error",
            ) from exc
        except Exception as exc:
            logger.error("Gemini API call failed: %s", exc)
            raise ServiceUnavailableError(
                "The AI service is temporarily unavailable. Please try again shortly.",
                error_code="ai_provider_error",
            ) from exc

    async def generate_company_insight(
        self, *, company_name: str, industry: str | None, contact_name: str | None
    ) -> dict[str, Any]:
        return await self._generate_json(
            COMPANY_INSIGHT_SYSTEM_PROMPT,
            build_company_insight_user_prompt(company_name, industry, contact_name),
        )

    async def generate_lead_score(
        self, *, company_name: str, industry: str | None, insight: dict[str, Any] | None
    ) -> dict[str, Any]:
        result = await self._generate_json(
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
        return await self._generate_json(
            OUTREACH_EMAIL_SYSTEM_PROMPT,
            build_outreach_email_user_prompt(company_name, contact_name, industry, insight),
        )

    async def summarize_conversation(self, *, transcript: str) -> dict[str, Any]:
        result = await self._generate_json(
            CONVERSATION_SUMMARY_SYSTEM_PROMPT,
            build_conversation_summary_user_prompt(transcript),
        )
        result.setdefault("action_items", [])
        return result
