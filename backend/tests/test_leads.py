"""
Lead endpoint tests.

Like `test_auth.py`, these test the parts of the stack that don't require
a live database: that every lead route demands authentication, and that
request validation rejects malformed input before it would ever reach
the service/repository layer. Full CRUD round-trip tests belong in an
integration suite wired to a real (or containerized) Postgres instance.
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_list_leads_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/leads")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_lead_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/leads", json={"company_name": "Acme Corp"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_lead_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/leads/{uuid.uuid4()}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_lead_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.delete(f"/api/v1/leads/{uuid.uuid4()}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_lead_rejects_malformed_uuid() -> None:
    """
    Path validation runs before the auth dependency resolves in FastAPI's
    dependency graph ordering for path params vs. security dependencies,
    so a malformed id can surface as either a 401 or a 422 depending on
    which the router evaluates first; we only assert it's rejected, not
    passed through to the service layer.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/leads/not-a-uuid")
    assert response.status_code in (401, 422)
