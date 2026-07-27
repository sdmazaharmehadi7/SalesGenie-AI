"""
Unit tests for `MockAIProvider`.

These run with zero external dependencies (no DB, no network) since the
mock provider is pure, deterministic logic — exactly the kind of thing
that should be covered without needing the full app/DB test harness.
"""

import pytest

from app.integrations.ai.mock_client import MockAIProvider


@pytest.mark.asyncio
async def test_generate_company_insight_returns_expected_keys() -> None:
    provider = MockAIProvider()
    result = await provider.generate_company_insight(
        company_name="Acme Corp", industry="Manufacturing", contact_name="Jane Doe"
    )
    assert set(result.keys()) == {"business_needs", "opportunities", "industry_analysis"}
    assert "Acme Corp" in result["business_needs"]


@pytest.mark.asyncio
async def test_generate_lead_score_is_deterministic_and_in_range() -> None:
    provider = MockAIProvider()
    result_a = await provider.generate_lead_score(
        company_name="Acme Corp", industry="Manufacturing", insight=None
    )
    result_b = await provider.generate_lead_score(
        company_name="Acme Corp", industry="Manufacturing", insight=None
    )

    assert result_a == result_b  # deterministic for the same input
    assert 0 <= result_a["lead_score"] <= 100
    assert 0.0 <= result_a["conversion_probability"] <= 1.0


@pytest.mark.asyncio
async def test_generate_lead_score_differs_across_companies() -> None:
    provider = MockAIProvider()
    result_a = await provider.generate_lead_score(company_name="Acme Corp", industry=None, insight=None)
    result_b = await provider.generate_lead_score(company_name="Globex Inc", industry=None, insight=None)
    assert result_a != result_b


@pytest.mark.asyncio
async def test_generate_outreach_email_returns_expected_keys() -> None:
    provider = MockAIProvider()
    result = await provider.generate_outreach_email(
        company_name="Acme Corp", contact_name="Jane Doe", industry="Manufacturing", insight=None
    )
    assert set(result.keys()) == {"email_subject", "email_content"}
    assert "Jane" in result["email_content"]


@pytest.mark.asyncio
async def test_summarize_conversation_returns_expected_keys() -> None:
    provider = MockAIProvider()
    result = await provider.summarize_conversation(transcript="We discussed pricing and timeline.")
    assert set(result.keys()) == {"summary", "action_items"}
    assert isinstance(result["action_items"], list)
    assert len(result["action_items"]) > 0
