"""CRM endpoints tests."""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_accounts_require_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/accounts")
        assert res.status_code == 401

        res = await client.post("/api/v1/accounts", json={"name": "Acme Corp"})
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_contacts_require_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/contacts")
        assert res.status_code == 401

        res = await client.post("/api/v1/contacts", json={"first_name": "Jane"})
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_opportunities_require_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/opportunities")
        assert res.status_code == 401

        res = await client.get("/api/v1/opportunities/pipeline/board")
        assert res.status_code == 401

        res = await client.post("/api/v1/opportunities", json={"name": "Cloud Deal"})
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_tasks_require_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/tasks")
        assert res.status_code == 401

        res = await client.post("/api/v1/tasks", json={"title": "Follow up call"})
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_crm_summary_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/crm/summary")
        assert res.status_code == 401

        res = await client.get("/api/v1/crm/forecast")
        assert res.status_code == 401

        res = await client.get("/api/v1/crm/lead-recommendations")
        assert res.status_code == 401

