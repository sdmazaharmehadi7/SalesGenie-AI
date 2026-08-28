"""Tests for Manager Team Tracking & Performance Dashboard."""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_team_tracking_endpoints_and_authorization():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique = uuid.uuid4().hex[:6]

        # 1. Register Manager A and Member B
        from tests.conftest import register_and_verify_user
        token_a = await register_and_verify_user(client, "Manager Alpha", f"manager_{unique}@example.com", "Password123!")
        headers_a = {"Authorization": f"Bearer {token_a}"}

        token_b = await register_and_verify_user(client, "Member Beta", f"member_{unique}@example.com", "Password123!")
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 2. Manager A creates workspace
        ws_res = await client.post("/api/v1/workspaces", headers=headers_a, json={
            "name": "Alpha Sales HQ", "slug": f"alpha-hq-{unique}"
        })
        ws_id = ws_res.json()["id"]

        # 3. Manager A invites Member B
        inv_res = await client.post(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_a, json={
            "email": f"member_{unique}@example.com", "role": "team_member"
        })
        inv_token = inv_res.json()["token"]

        # Member B accepts invitation
        await client.post("/api/v1/workspaces/invitations/accept", headers=headers_b, json={"token": inv_token})

        # 4. Member B creates a lead and a WON opportunity in workspace
        await client.post(f"/api/v1/leads?workspace_id={ws_id}", headers=headers_b, json={
            "company_name": "Beta Prospect Corp", "lead_status": "qualified", "deal_value": 50000
        })

        # Member B creates an opportunity with stage "won"
        await client.post(f"/api/v1/opportunities?workspace_id={ws_id}", headers=headers_b, json={
            "name": "Beta Enterprise Deal", "stage": "won", "amount": 75000
        })

        # Manager creates an opportunity with stage "lost"
        await client.post(f"/api/v1/opportunities?workspace_id={ws_id}", headers=headers_a, json={
            "name": "Alpha Stalled Deal", "stage": "lost", "amount": 25000
        })

        # 5. Manager calls team tracking endpoints (should succeed with 200)
        sum_res = await client.get(f"/api/v1/team-tracking/summary?workspace_id={ws_id}&range=month", headers=headers_a)
        assert sum_res.status_code == 200, sum_res.text
        summary = sum_res.json()
        assert summary["total_members"] == 2
        assert summary["total_leads"] >= 1
        assert summary["deals_won"] >= 1
        assert float(summary["team_revenue"]) >= 75000

        mems_res = await client.get(f"/api/v1/team-tracking/members?workspace_id={ws_id}&range=month", headers=headers_a)
        assert mems_res.status_code == 200, mems_res.text
        members = mems_res.json()
        assert len(members) == 2

        member_b_data = next((m for m in members if m["name"] == "Member Beta"), None)
        assert member_b_data is not None
        assert member_b_data["deals_won"] == 1
        assert float(member_b_data["revenue"]) == 75000

        manager_a_data = next((m for m in members if m["name"] == "Manager Alpha"), None)
        assert manager_a_data is not None
        assert manager_a_data["deals_lost"] == 1

        # 6. Team AI Insights endpoint (exercises get_team_insights & get_team_members_performance)
        insights_res = await client.get(f"/api/v1/team-tracking/insights?workspace_id={ws_id}", headers=headers_a)
        assert insights_res.status_code == 200, insights_res.text
        insights_data = insights_res.json()
        assert "insights" in insights_data
        assert len(insights_data["insights"]) > 0

        # 7. Team Charts endpoint
        charts_res = await client.get(f"/api/v1/team-tracking/charts?workspace_id={ws_id}&range=month", headers=headers_a)
        assert charts_res.status_code == 200, charts_res.text
        charts = charts_res.json()
        assert "revenue_by_member" in charts
        assert "deals_won_by_member" in charts
        assert "team_activity_over_time" in charts

        follow_res = await client.get(f"/api/v1/team-tracking/follow-ups?workspace_id={ws_id}", headers=headers_a)
        assert follow_res.status_code == 200, follow_res.text

        # 8. Test with an empty workspace (zero opportunities / zero leads)
        empty_ws_res = await client.post("/api/v1/workspaces", headers=headers_a, json={
            "name": "Empty HQ", "slug": f"empty-hq-{unique}"
        })
        empty_ws_id = empty_ws_res.json()["id"]

        empty_sum = await client.get(f"/api/v1/team-tracking/summary?workspace_id={empty_ws_id}", headers=headers_a)
        assert empty_sum.status_code == 200
        assert empty_sum.json()["deals_won"] == 0
        assert float(empty_sum.json()["team_revenue"]) == 0

        empty_insights = await client.get(f"/api/v1/team-tracking/insights?workspace_id={empty_ws_id}", headers=headers_a)
        assert empty_insights.status_code == 200
        assert len(empty_insights.json()["insights"]) > 0

        # 9. Team Member B attempts to access manager-only team tracking (should get 403 Forbidden)
        denied_res = await client.get(f"/api/v1/team-tracking/summary?workspace_id={ws_id}", headers=headers_b)
        assert denied_res.status_code == 403

        # 10. Personal Area access without workspace_id (should get 403 Forbidden)
        personal_denied = await client.get("/api/v1/team-tracking/summary", headers=headers_a)
        assert personal_denied.status_code == 403
