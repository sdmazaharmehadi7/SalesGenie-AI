"""
Auth-related tests.

`test_register_validation_error` and `test_login_route_exists` don't
require a live Postgres instance — they exercise request validation and
routing. Full integration tests (real register -> login -> refresh -> me
round trip against a test database) should be added once a test-database
fixture (e.g. via `pytest-postgresql` or a dockerized test DB) is wired up;
that's flagged here as the next step rather than implemented against a
mocked DB, since mocking SQLAlchemy sessions convincingly is worse than
no test at all.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_register_rejects_weak_password() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "short",  # fails min_length=8
            },
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_rejects_invalid_email() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Test User",
                "email": "not-an-email",
                "password": "validpass1",
            },
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_me_requires_authentication() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_garbage_token() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": "not-a-real-token"}
        )
    assert response.status_code == 401
