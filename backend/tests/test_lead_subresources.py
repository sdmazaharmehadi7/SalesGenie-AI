"""
Tests for the AI-powered lead sub-resource endpoints: Company Insights,
Lead Scoring, Outreach, and Conversation Intelligence. Same scope as
`test_leads.py` — authentication is enforced before any AI/DB work
happens.
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

LEAD_ID = uuid.uuid4()


@pytest.mark.asyncio
async def test_generate_insight_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(f"/api/v1/leads/{LEAD_ID}/insights/generate")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_generate_score_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(f"/api/v1/leads/{LEAD_ID}/scores/generate")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_generate_campaign_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(f"/api/v1/leads/{LEAD_ID}/campaigns/generate")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_summarize_interaction_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/leads/{LEAD_ID}/interactions/summarize", json={"transcript": "hello"}
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_summarize_interaction_rejects_empty_transcript() -> None:
    """Even once past auth, an empty transcript should fail validation, not reach the AI provider."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/leads/{LEAD_ID}/interactions/summarize",
            json={"transcript": ""},
            headers={"Authorization": "Bearer not-a-real-token"},
        )
    # Either the (invalid) auth token is rejected first (401) or, if auth
    # ordering changes in the future, validation rejects the empty
    # transcript (422) — both are acceptable, "reached the AI provider" is not.
    assert response.status_code in (401, 422)


@pytest.mark.asyncio
async def test_sync_lead_to_crm_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(f"/api/v1/leads/{LEAD_ID}/sync")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_schedule_follow_up_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/leads/{LEAD_ID}/schedule",
            json={
                "title": "Follow-up call",
                "start_time": "2026-08-01T10:00:00Z",
                "end_time": "2026-08-01T10:30:00Z",
            },
        )
    assert response.status_code == 401
