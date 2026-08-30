"""
services.py — Service Layer for AI-Powered Sales Forecasting Platform Using Predictive Analytics
================================================================
Contains core business logic for interacting with Google Gemini.

Architecture:
  - Single shared function `get_ai_response()` communicates with Gemini,
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

from app.ai.client import gemini_client, PRIMARY_MODEL
from app.ai.prompts import (
    SALES_SYSTEM_PROMPT,
    EMAIL_PROMPT,
    SUMMARY_PROMPT,
    FOLLOWUP_PROMPT,
    LEAD_QUALITY_PROMPT,
    OBJECTION_PROMPT,
    DEAL_RISK_PROMPT,
    NEXT_BEST_ACTION_PROMPT,
    COMPANY_INSIGHT_PROMPT,
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
    """Invokes the Gemini provider and returns the raw string response.

    Raises AIServiceError if the client is not initialized or the API call fails.
    """
    if not gemini_client:
        raise AIServiceError(
            "Gemini client is not initialized. Please check GEMINI_API_KEY in .env."
        )

    full_prompt = f"{system_prompt}\n\nUser Request: {user_message.strip()}"
    generation_config = genai.types.GenerationConfig(
        temperature=temperature,
        max_output_tokens=max_tokens,
        response_mime_type="application/json",
    )
    try:
        response = gemini_client.generate_content(
            full_prompt,
            generation_config=generation_config,
        )
        return response.text or ""
    except (RetryError, GoogleAPICallError) as exc:
        logger.error("Gemini API error: %s", exc)
        raise AIServiceError(f"Gemini API error: {exc}") from exc
    except Exception as exc:
        logger.error("Unexpected error calling Gemini: %s", exc)
        raise AIServiceError(f"Gemini provider error: {exc}") from exc


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
    """Single shared function that calls Gemini, parses JSON safely,
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

def general_chat(
    message: str,
    crm_context: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> tuple[dict[str, Any], str]:
    """Process general sales assistant queries with compact CRM context & chat history."""
    prompt_sections = []
    if crm_context:
        prompt_sections.append(f"CRM CONTEXT:\n{crm_context.strip()}")

    if history:
        # Take at most last 6 messages to save tokens
        recent_history = history[-6:]
        history_lines = []
        for msg in recent_history:
            role = "User" if msg.get("role") == "user" else "Assistant"
            content = msg.get("content", "").strip()
            if content:
                if len(content) > 200:
                    content = content[:200] + "..."
                history_lines.append(f"{role}: {content}")
        if history_lines:
            prompt_sections.append(f"RECENT CONVERSATION:\n" + "\n".join(history_lines))

    prompt_sections.append(f"USER QUESTION:\n{message.strip()}")

    user_query = "\n\n".join(prompt_sections)
    data, model = get_ai_response(
        user_message=user_query,
        system_prompt=SALES_SYSTEM_PROMPT,
        capability_name="chat",
        max_tokens=1024,
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
            "company": "AI-Powered Sales Forecasting Platform Using Predictive Analytics",
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


def analyze_deal_risk(
    deal_name: str,
    stage: str,
    amount: float | None = None,
    expected_close_date: str | None = None,
    recent_interactions: str | None = None,
    notes: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Analyze deal risk & opportunity health using Gemini."""
    prompt_parts = [
        f"Deal Name: {deal_name}",
        f"Stage: {stage}",
    ]
    if amount is not None:
        prompt_parts.append(f"Deal Amount: ${amount:,.2f}")
    if expected_close_date:
        prompt_parts.append(f"Expected Close Date: {expected_close_date}")
    if notes:
        prompt_parts.append(f"Deal Notes: {notes}")
    if recent_interactions:
        prompt_parts.append(f"Recent Activities / Interactions:\n{recent_interactions}")

    user_query = "\n".join(prompt_parts)
    data, model = get_ai_response(
        user_message=user_query,
        system_prompt=DEAL_RISK_PROMPT,
        capability_name="deal-risk",
    )

    if not isinstance(data.get("risk_factors"), list):
        data["risk_factors"] = [str(data.get("risk_factors", ""))]
    if not isinstance(data.get("recommendations"), list):
        data["recommendations"] = [str(data.get("recommendations", ""))]

    return data, model


def get_next_best_action(
    context_type: str,
    entity_name: str,
    current_status: str,
    timeline_summary: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Get AI recommendation for next-best action on a lead/contact/deal."""
    prompt_parts = [
        f"Context: {context_type}",
        f"Entity Name: {entity_name}",
        f"Current Status / Stage: {current_status}",
    ]
    if timeline_summary:
        prompt_parts.append(f"Recent Context / Timeline:\n{timeline_summary}")

    user_query = "\n".join(prompt_parts)
    data, model = get_ai_response(
        user_message=user_query,
        system_prompt=NEXT_BEST_ACTION_PROMPT,
        capability_name="next-best-action",
    )

    if not isinstance(data.get("action_checklist"), list):
        data["action_checklist"] = []

    return data, model


def generate_company_intelligence(
    company_name: str,
    industry: str | None = None,
    website: str | None = None,
    company_size: str | None = None,
    description: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Generate in-depth B2B company intelligence and pain points."""
    prompt_parts = [f"Company Name: {company_name}"]
    if industry:
        prompt_parts.append(f"Industry: {industry}")
    if website:
        prompt_parts.append(f"Website: {website}")
    if company_size:
        prompt_parts.append(f"Company Size: {company_size}")
    if description:
        prompt_parts.append(f"Company Description: {description}")

    user_query = "\n".join(prompt_parts)
    data, model = get_ai_response(
        user_message=user_query,
        system_prompt=COMPANY_INSIGHT_PROMPT,
        capability_name="company-intelligence",
    )

    for list_field in ("business_needs", "sales_opportunities", "industry_trends"):
        if not isinstance(data.get(list_field), list):
            data[list_field] = [str(data.get(list_field, ""))]

    return data, model

