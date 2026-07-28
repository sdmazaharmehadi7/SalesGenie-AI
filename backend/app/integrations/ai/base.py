"""
AI provider abstraction.

Every AI-powered feature in the platform — Lead Intelligence (Module 4),
Lead Scoring (Module 6), Outreach Generation (Module 5), and Conversation
Summarization (Module 7) — depends on this interface, never on a concrete
provider (OpenAI, a mock, or anything else). This is the "Agentic AI
Layer" / "Large Language Model (Gemini/OpenAI)" box in the architecture
diagram: swapping the underlying model or introducing a full LangGraph
multi-agent graph later means implementing this one interface again,
with zero changes to any service that consumes it.

Each method returns a plain, already-validated dict shaped to match the
corresponding Pydantic `*Create` schema, so callers can do
`XCreate(**result)` directly.
"""

from abc import ABC, abstractmethod
from typing import Any


class AIProvider(ABC):
    """Abstract interface every concrete AI provider implements."""

    @abstractmethod
    async def generate_company_insight(
        self,
        *,
        company_name: str,
        industry: str | None,
        contact_name: str | None,
    ) -> dict[str, Any]:
        """
        Returns a dict with keys: `business_needs`, `opportunities`,
        `industry_analysis` (each a short paragraph of prose).
        """
        raise NotImplementedError

    @abstractmethod
    async def generate_lead_score(
        self,
        *,
        company_name: str,
        industry: str | None,
        insight: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """
        Returns a dict with keys: `lead_score` (int, 0-100),
        `conversion_probability` (float, 0.0-1.0).
        """
        raise NotImplementedError

    @abstractmethod
    async def generate_outreach_email(
        self,
        *,
        company_name: str,
        contact_name: str | None,
        industry: str | None,
        insight: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """
        Returns a dict with keys: `email_subject`, `email_content`
        (personalized cold outreach email, ready to send or edit).
        """
        raise NotImplementedError

    @abstractmethod
    async def summarize_conversation(self, *, transcript: str) -> dict[str, Any]:
        """
        Returns a dict with keys: `summary` (short paragraph),
        `action_items` (list[str]).
        """
        raise NotImplementedError
