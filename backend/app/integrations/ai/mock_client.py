"""
Mock implementation of `AIProvider`.

Provides canned, schema-valid JSON responses for local testing and
development without an API key. This is the default provider
when `AI_PROVIDER=mock`, so the backend is fully runnable and
demoable with zero external credentials.
"""

import hashlib
from typing import Any


def _stable_score(seed: str, low: int, high: int) -> int:
    """Deterministically map a string to an int in [low, high]."""
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    value = int(digest[:8], 16)
    return low + (value % (high - low + 1))


class MockAIProvider:
    """
    Implements the same interface as `AIProvider` (see `base.py`) without
    inheriting from it directly via ABC registration — duck-typed, since
    the dependency that constructs providers (`get_ai_provider`) only
    cares that the returned object has these four async methods.
    """

    async def generate_company_insight(
        self, *, company_name: str, industry: str | None, contact_name: str | None
    ) -> dict[str, Any]:
        industry_label = industry or "their industry"
        return {
            "business_needs": (
                f"{company_name} is likely facing growing operational complexity typical "
                f"of companies in {industry_label}, including manual processes that slow "
                "down cross-team execution."
            ),
            "opportunities": (
                f"There is a clear opportunity to help {company_name} consolidate "
                "fragmented workflows and surface actionable insights faster, "
                "shortening their internal decision cycles."
            ),
            "industry_analysis": (
                f"Companies in {industry_label} are increasingly investing in AI-driven "
                "tooling to stay competitive, making this a timely conversation."
            ),
        }

    async def generate_lead_score(
        self, *, company_name: str, industry: str | None, insight: dict[str, Any] | None
    ) -> dict[str, Any]:
        score = _stable_score(f"score:{company_name}:{industry}", 55, 97)
        probability = round(score / 125, 2)  # keeps probability plausibly below the score
        return {"lead_score": score, "conversion_probability": probability}

    async def generate_outreach_email(
        self,
        *,
        company_name: str,
        contact_name: str | None,
        industry: str | None,
        insight: dict[str, Any] | None,
    ) -> dict[str, Any]:
        greeting_name = contact_name.split(" ")[0] if contact_name else "there"
        needs = (insight or {}).get(
            "business_needs", f"the operational challenges common in {industry or 'your industry'}"
        )
        return {
            "email_subject": f"Quick idea for {company_name}",
            "email_content": (
                f"Hi {greeting_name},\n\n"
                f"I noticed {company_name} might be dealing with {needs.lower() if isinstance(needs, str) else needs}\n\n"
                "We've helped similar companies streamline this with measurable results "
                "in weeks, not quarters.\n\n"
                "Worth a quick 15-minute call this week to see if it's a fit?\n\n"
                "Best,\nAI-Powered Sales Forecasting Platform Using Predictive Analytics"
            ),
        }

    async def summarize_conversation(self, *, transcript: str) -> dict[str, Any]:
        word_count = len(transcript.split())
        return {
            "summary": (
                f"Call covered {word_count} words of discussion around the prospect's "
                "current process, technical requirements, and next steps."
            ),
            "action_items": [
                "Send follow-up recap email within 24 hours.",
                "Share relevant case study with the prospect.",
                "Schedule technical deep-dive with the prospect's team.",
            ],
        }
