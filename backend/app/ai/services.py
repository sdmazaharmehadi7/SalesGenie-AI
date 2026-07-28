"""
services.py — Shared Service Layer for SalesGenie AI Module
================================================================
Contains core business logic for interacting with AI models (Gemini / OpenAI).

Architecture:
  - Single shared function `get_ai_response()` communicates with the active provider,
    parses JSON safely with `json.loads()`, validates structure, retries once on invalid JSON,
    and logs performance/errors cleanly.
  - Dedicated capability wrapper functions inject structured prompts and return typed dicts.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import google.generativeai as genai
from google.api_core.exceptions import GoogleAPICallError, RetryError
from openai import APIConnectionError, APIStatusError, APITimeoutError

from app.ai.client import PROVIDER, PRIMARY_MODEL, gemini_client, openai_client
from app.ai.prompts import (
    SALES_SYSTEM_PROMPT,
    EMAIL_PROMPT,
    SUMMARY_PROMPT,
    FOLLOWUP_PROMPT,
    LEAD_QUALITY_PROMPT,
    OBJECTION_PROMPT,
)

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    """Custom exception for AI service errors."""


def _clean_json_text(text: str) -> str:
    """Helper function to strip markdown code fences and whitespace from raw AI output."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        # Remove opening fence (e.g. ```json or ```)
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        # Remove closing fence (```)
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    return cleaned


def _call_raw_provider(
    user_message: str,
    system_prompt: str,
    temperature: float,
    max_tokens: int,
) -> str:
    """Invokes the active AI provider (Gemini or OpenAI) and returns the raw string response."""
    if gemini_client:
        full_prompt = f"{system_prompt}\n\nUser Request: {user_message.strip()}"
        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            response_mime_type="application/json",  # Force Gemini JSON mode if supported
        )
        try:
            response = gemini_client.generate_content(
                full_prompt,
                generation_config=generation_config,
            )
            return response.text or ""
        except (RetryError, GoogleAPICallError, Exception) as exc:
            logger.error("Gemini provider error: %s", exc)
            raise AIServiceError(f"Gemini API error: {exc}") from exc

    elif openai_client:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message.strip()},
        ]
        try:
            completion = openai_client.chat.completions.create(
                model=PRIMARY_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},  # Force OpenAI JSON mode
            )
            return completion.choices[0].message.content or ""
        except (APITimeoutError, APIConnectionError, APIStatusError, Exception) as exc:
            logger.error("OpenAI provider error: %s", exc)
            raise AIServiceError(f"OpenAI API error: {exc}") from exc

    else:
        raise AIServiceError("No AI provider is initialized. Please check API keys in .env.")


# ---------------------------------------------------------------------------
# CORE SHARED FUNCTION WITH JSON PARSING, RETRY & LOGGING
# ---------------------------------------------------------------------------
def get_ai_response(
    user_message: str,
    *,
    system_prompt: str = SALES_SYSTEM_PROMPT,
    capability_name: str = "general_chat",
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> tuple[dict[str, Any], str]:
    """Single shared function that calls the AI provider, parses JSON safely,
    retries once if JSON is invalid, and logs performance.

    Returns:
        tuple[dict[str, Any], str]: (parsed_json_dict, model_name)
    """
    if not user_message or not user_message.strip():
        raise ValueError("user_message must be a non-empty string.")

    start_time = time.perf_counter()

    # First attempt
    raw_text = _call_raw_provider(
        user_message=user_message,
        system_prompt=system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    cleaned_text = _clean_json_text(raw_text)

    try:
        parsed_json = json.loads(cleaned_text)
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "AI Request Success | capability=%s | model=%s | duration=%.2fms",
            capability_name,
            PRIMARY_MODEL,
            duration_ms,
        )
        return parsed_json, PRIMARY_MODEL

    except (json.JSONDecodeError, TypeError) as first_err:
        logger.warning(
            "JSON parsing failed on 1st attempt | capability=%s | model=%s | error=%s. Retrying...",
            capability_name,
            PRIMARY_MODEL,
            first_err,
        )

        # Retry once with explicit JSON reinforcement prompt
        retry_prompt = (
            f"{system_prompt}\n\n"
            "CRITICAL INSTRUCTION: Your previous response was NOT valid JSON. "
            "You MUST output strictly valid raw JSON. Do NOT include markdown code blocks, preambles, or notes."
        )

        raw_retry_text = _call_raw_provider(
            user_message=user_message,
            system_prompt=retry_prompt,
            temperature=0.3,  # Lower temperature for stricter JSON adherence
            max_tokens=max_tokens,
        )

        cleaned_retry_text = _clean_json_text(raw_retry_text)

        try:
            parsed_json = json.loads(cleaned_retry_text)
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                "AI Request Success after retry | capability=%s | model=%s | duration=%.2fms",
                capability_name,
                PRIMARY_MODEL,
                duration_ms,
            )
            return parsed_json, PRIMARY_MODEL

        except (json.JSONDecodeError, TypeError) as second_err:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                "JSON parsing failed on 2nd attempt | capability=%s | model=%s | duration=%.2fms | error=%s",
                capability_name,
                PRIMARY_MODEL,
                duration_ms,
                second_err,
            )
            raise AIServiceError(
                "AI provider failed to return a valid JSON response structure."
            ) from second_err


# ---------------------------------------------------------------------------
# WRAPPER FUNCTIONS FOR EACH CAPABILITY
# ---------------------------------------------------------------------------

def general_chat(message: str) -> tuple[dict[str, Any], str]:
    """Process general sales assistant queries."""
    data, model = get_ai_response(
        user_message=message,
        system_prompt=SALES_SYSTEM_PROMPT,
        capability_name="chat",
    )
    # Ensure fallback fields if model deviated
    if "reply" not in data:
        data = {"reply": str(data)}
    return data, model


def generate_email(
    lead_info: str,
    email_type: str = "cold_outreach",
    prospect_name: str | None = None,
    company_name: str | None = None,
    pain_points: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Generate B2B outreach and sales emails returning structured JSON."""
    prompt_parts = [
        f"Email Type: {email_type}",
        f"Lead Information: {lead_info}",
    ]
    if prospect_name:
        prompt_parts.append(f"Prospect Name: {prospect_name}")
    if company_name:
        prompt_parts.append(f"Company Name: {company_name}")
    if pain_points:
        prompt_parts.append(f"Pain Points: {pain_points}")

    user_query = "\n".join(prompt_parts)
    data, model = get_ai_response(
        user_message=user_query,
        system_prompt=EMAIL_PROMPT,
        capability_name="email",
    )

    # Validate structure defaults if needed
    if not isinstance(data.get("subject_options"), list):
        data["subject_options"] = [str(data.get("subject_options", "Outreach Email"))]
    if "signature" not in data or not isinstance(data["signature"], dict):
        data["signature"] = {
            "name": "[Your Name]",
            "designation": "Sales Consultant",
            "company": "SalesGenie AI",
        }

    return data, model


def summarize_conversation(content: str, source_type: str = "transcript") -> tuple[dict[str, Any], str]:
    """Summarize sales conversations into structured JSON."""
    user_query = f"Source Format: {source_type}\n\nContent to Summarize:\n{content}"
    data, model = get_ai_response(
        user_message=user_query,
        system_prompt=SUMMARY_PROMPT,
        capability_name="summarize",
    )

    # Validate list fields
    if not isinstance(data.get("key_points"), list):
        data["key_points"] = [str(data.get("key_points", ""))]
    if not isinstance(data.get("customer_requirements"), list):
        data["customer_requirements"] = [str(data.get("customer_requirements", ""))]
    if not isinstance(data.get("action_items"), list):
        data["action_items"] = []

    return data, model


def suggest_followup(
    context: str,
    deal_stage: str | None = None,
    last_interaction: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Recommend follow-up strategies returning structured JSON."""
    prompt_parts = [f"Deal Context: {context}"]
    if deal_stage:
        prompt_parts.append(f"Deal Stage: {deal_stage}")
    if last_interaction:
        prompt_parts.append(f"Last Interaction: {last_interaction}")

    user_query = "\n".join(prompt_parts)
    data, model = get_ai_response(
        user_message=user_query,
        system_prompt=FOLLOWUP_PROMPT,
        capability_name="followup",
    )
    return data, model


def analyze_lead_quality(
    lead_info: str,
    company_size: str | None = None,
    industry: str | None = None,
    budget_signals: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Score and qualify leads returning structured JSON."""
    prompt_parts = [f"Lead Details: {lead_info}"]
    if company_size:
        prompt_parts.append(f"Company Size: {company_size}")
    if industry:
        prompt_parts.append(f"Industry: {industry}")
    if budget_signals:
        prompt_parts.append(f"Budget Signals: {budget_signals}")

    user_query = "\n".join(prompt_parts)
    data, model = get_ai_response(
        user_message=user_query,
        system_prompt=LEAD_QUALITY_PROMPT,
        capability_name="lead-score",
    )

    if not isinstance(data.get("key_strengths"), list):
        data["key_strengths"] = [str(data.get("key_strengths", ""))]
    if not isinstance(data.get("risks_and_red_flags"), list):
        data["risks_and_red_flags"] = [str(data.get("risks_and_red_flags", ""))]

    return data, model


def handle_objection(
    objection: str,
    category: str = "pricing",
    competitor_name: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Generate objection handling response returning structured JSON."""
    prompt_parts = [
        f"Objection Category: {category}",
        f"Prospect Objection: {objection}",
    ]
    if competitor_name:
        prompt_parts.append(f"Competitor: {competitor_name}")

    user_query = "\n".join(prompt_parts)
    data, model = get_ai_response(
        user_message=user_query,
        system_prompt=OBJECTION_PROMPT,
        capability_name="objection",
    )
    return data, model
