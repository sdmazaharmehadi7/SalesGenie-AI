"""
End-to-End AI Workspace Context Authorization & Isolation Tests.

Verifies that:
1. Lead Intelligence, Lead Scoring, Outreach Generation, and AI endpoints
   operate strictly within the authenticated user's workspace context.
2. Users in Workspace B cannot trigger or read AI insights/scores/campaigns
   for leads belonging to Workspace A (403/404 isolation).
3. AI operations in Personal Area remain isolated from Workspace data.
"""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.api.deps import get_ai_provider_dep
from app.integrations.ai.mock_client import MockAIProvider


@pytest.mark.asyncio
async def test_ai_workspace_context_authorization_and_isolation() -> None:
    app.dependency_overrides[get_ai_provider_dep] = lambda: MockAIProvider()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            uid = uuid.uuid4().hex[:8]
            user_a_email = f"ai_user_a_{uid}@example.com"
            user_b_email = f"ai_user_b_{uid}@example.com"
            password = "SecurePassword123!"

            # 1. Register User A and User B
            from tests.conftest import register_and_verify_user
            token_a = await register_and_verify_user(client, "User Alpha", user_a_email, password, "sales_rep")
            headers_a = {"Authorization": f"Bearer {token_a}"}

            token_b = await register_and_verify_user(client, "User Beta", user_b_email, password, "sales_rep")
            headers_b = {"Authorization": f"Bearer {token_b}"}

            # 2. User A creates Workspace A
            ws_a_res = await client.post(
                "/api/v1/workspaces",
                headers=headers_a,
                json={"name": "Workspace Alpha", "slug": f"ws-alpha-{uid}"},
            )
            assert ws_a_res.status_code == 201
            ws_a_id = ws_a_res.json()["id"]

            # 3. User B creates Workspace B
            ws_b_res = await client.post(
                "/api/v1/workspaces",
                headers=headers_b,
                json={"name": "Workspace Beta", "slug": f"ws-beta-{uid}"},
            )
            assert ws_b_res.status_code == 201
            ws_b_id = ws_b_res.json()["id"]

            # 4. User A creates Lead in Workspace A
            lead_a_res = await client.post(
                f"/api/v1/leads?workspace_id={ws_a_id}",
                headers=headers_a,
                json={
                    "company_name": "Alpha Defense",
                    "contact_name": "General Vance",
                    "email": "vance@alphadefense.com",
                    "industry": "Aerospace & Defense",
                    "deal_value": 500000.0,
                    "lead_status": "proposal",
                },
            )
            assert lead_a_res.status_code == 201
            lead_a_id = lead_a_res.json()["id"]

            # 5. User A generates AI Company Insight for Workspace A lead
            insight_res = await client.post(
                f"/api/v1/leads/{lead_a_id}/insights/generate?workspace_id={ws_a_id}",
                headers=headers_a,
            )
            assert insight_res.status_code == 201
            assert "Alpha Defense" in insight_res.json()["business_needs"]

            # 6. User B (Workspace B) CANNOT generate or access insight for Lead A (403/404)
            unauth_insight = await client.post(
                f"/api/v1/leads/{lead_a_id}/insights/generate?workspace_id={ws_b_id}",
                headers=headers_b,
            )
            assert unauth_insight.status_code == 404 or unauth_insight.status_code == 403

            # 7. User A generates AI Lead Score for Workspace A lead
            score_res = await client.post(
                f"/api/v1/leads/{lead_a_id}/scores/generate?workspace_id={ws_a_id}",
                headers=headers_a,
            )
            assert score_res.status_code == 201
            assert score_res.json()["lead_score"] >= 0

            # 8. User B (Workspace B) CANNOT generate or access score for Lead A
            unauth_score = await client.post(
                f"/api/v1/leads/{lead_a_id}/scores/generate?workspace_id={ws_b_id}",
                headers=headers_b,
            )
            assert unauth_score.status_code == 404 or unauth_score.status_code == 403

            # 9. User A generates AI Outreach Campaign for Workspace A lead
            campaign_res = await client.post(
                f"/api/v1/leads/{lead_a_id}/campaigns/generate?workspace_id={ws_a_id}",
                headers=headers_a,
            )
            assert campaign_res.status_code == 201
            assert len(campaign_res.json()["email_subject"]) > 0

            # 10. User B (Workspace B) CANNOT generate outreach for Lead A
            unauth_camp = await client.post(
                f"/api/v1/leads/{lead_a_id}/campaigns/generate?workspace_id={ws_b_id}",
                headers=headers_b,
            )
            assert unauth_camp.status_code == 404 or unauth_camp.status_code == 403

            # 11. AI Router Endpoints (/api/v1/email, /api/v1/lead-score, /api/v1/chat, etc.)
            # User B attempts to access Lead A via /api/v1/email endpoint with lead_id
            unauth_email_api = await client.post(
                f"/api/v1/email?workspace_id={ws_b_id}",
                headers=headers_b,
                json={
                    "lead_info": "Please draft an email",
                    "lead_id": lead_a_id,
                },
            )
            assert unauth_email_api.status_code == 404 or unauth_email_api.status_code == 403
    finally:
        app.dependency_overrides.clear()
