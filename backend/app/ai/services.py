"""
services.py — AI Service Layer for SalesGenie AI
==================================================
This module contains the core business logic for interacting with the OpenAI
API. It acts as the bridge between the API routes layer and the raw OpenAI
client, keeping both sides clean and decoupled.

All public functions in this module:
  - Accept plain Python types (strings, dicts).
  - Return plain Python types (strings).
  - Raise ``AIServiceError`` on recoverable failures so callers can handle
    errors uniformly without catching SDK-specific exceptions.

Usage:
    from app.ai.services import get_ai_response

    reply = get_ai_response(user_message="Draft an email to Acme Corp.")
"""

from __future__ import annotations

import logging

from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI

from app.ai.client import OPENAI_MODEL, openai_client
from app.ai.prompts import SALES_SYSTEM_PROMPT

# ---------------------------------------------------------------------------
# Module-level logger — inherits the root logger configuration so log output
# is controlled centrally (e.g. via uvicorn or a logging.config file).
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exception — lets callers catch a single, project-defined error type
# instead of importing OpenAI SDK internals throughout the codebase.
# ---------------------------------------------------------------------------
class AIServiceError(Exception):
    """Raised when the AI service layer encounters an unrecoverable error."""


# ---------------------------------------------------------------------------
# Core service function
# ---------------------------------------------------------------------------

def get_ai_response(
    user_message: str,
    *,
    system_prompt: str = SALES_SYSTEM_PROMPT,
    model: str = OPENAI_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    client: OpenAI = openai_client,
) -> str:
    """Send a user message to OpenAI and return the assistant's reply.

    Parameters
    ----------
    user_message:
        The text submitted by the end user or calling service.
    system_prompt:
        The system-level instruction that sets the AI's behaviour.
        Defaults to ``SALES_SYSTEM_PROMPT`` from prompts.py.
    model:
        The OpenAI model identifier to use. Defaults to ``OPENAI_MODEL``
        from config.py so the value can be changed via environment variable.
    temperature:
        Sampling temperature (0 = deterministic, 1 = very creative).
        0.7 balances creativity with reliability for sales copy.
    max_tokens:
        Upper bound on the length of the response.
    client:
        The ``OpenAI`` client instance to use. Defaults to the shared
        singleton from client.py; can be overridden in tests with a mock.

    Returns
    -------
    str
        The assistant's text response, stripped of leading/trailing whitespace.

    Raises
    ------
    ValueError
        If ``user_message`` is empty or whitespace-only.
    AIServiceError
        If the OpenAI API returns an error, times out, or is unreachable.
    """
    # -- Input validation ----------------------------------------------------
    if not user_message or not user_message.strip():
        raise ValueError("user_message must be a non-empty string.")

    # -- Build message payload -----------------------------------------------
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_message.strip()},
    ]

    # -- Call OpenAI API -----------------------------------------------------
    logger.info("Sending request to OpenAI | model=%s | tokens_limit=%d", model, max_tokens)

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    except APITimeoutError as exc:
        logger.error("OpenAI request timed out: %s", exc)
        raise AIServiceError(
            "The request to OpenAI timed out. Please try again."
        ) from exc

    except APIConnectionError as exc:
        logger.error("Could not connect to OpenAI: %s", exc)
        raise AIServiceError(
            "Unable to reach the OpenAI API. Check your network connection."
        ) from exc

    except APIStatusError as exc:
        # Covers 4xx / 5xx HTTP responses (quota exceeded, invalid key, etc.)
        logger.error(
            "OpenAI API error | status=%s | message=%s",
            exc.status_code,
            exc.message,
        )
        raise AIServiceError(
            f"OpenAI returned an error (HTTP {exc.status_code}): {exc.message}"
        ) from exc

    # -- Extract and return assistant content --------------------------------
    reply: str = completion.choices[0].message.content or ""

    logger.info(
        "OpenAI response received | finish_reason=%s | chars=%d",
        completion.choices[0].finish_reason,
        len(reply),
    )

    return reply.strip()


# ---------------------------------------------------------------------------
# Convenience wrappers — thin helpers that inject task-specific prompts so
# routes stay clean and import only what they need.
# ---------------------------------------------------------------------------

def generate_email(lead_info: str) -> str:
    """Generate a B2B outreach email for the given lead information."""
    from app.ai.prompts import EMAIL_PROMPT  # local import avoids circular deps

    combined_prompt = f"{EMAIL_PROMPT}\n\nLead information:\n{lead_info}"
    return get_ai_response(combined_prompt)


def summarize_conversation(conversation: str) -> str:
    """Summarise a sales conversation or email thread."""
    from app.ai.prompts import SUMMARY_PROMPT

    combined_prompt = f"{SUMMARY_PROMPT}\n\nConversation:\n{conversation}"
    return get_ai_response(combined_prompt)


def suggest_followup(context: str) -> str:
    """Recommend a follow-up strategy based on the provided context."""
    from app.ai.prompts import FOLLOWUP_PROMPT

    combined_prompt = f"{FOLLOWUP_PROMPT}\n\nContext:\n{context}"
    return get_ai_response(combined_prompt)


def analyze_lead_quality(lead_info: str) -> str:
    """Score and evaluate the quality of a lead against ICP criteria."""
    from app.ai.prompts import LEAD_QUALITY_PROMPT

    combined_prompt = f"{LEAD_QUALITY_PROMPT}\n\nLead information:\n{lead_info}"
    return get_ai_response(combined_prompt)


def handle_objection(objection: str) -> str:
    """Generate a professional objection-handling response."""
    from app.ai.prompts import OBJECTION_PROMPT

    combined_prompt = f"{OBJECTION_PROMPT}\n\nObjection:\n{objection}"
    return get_ai_response(combined_prompt)
