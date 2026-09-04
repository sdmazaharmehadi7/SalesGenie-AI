"""Tests for CRM Automated Lead Follow-up & Next Steps Recommendation Engine."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import register_and_verify_user


@pytest.mark.asyncio
async def test_crm_lead_recommendations_and_summary() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        uid = uuid.uuid4().hex[:8]
        user_email = f"crm_rec_user_{uid}@example.com"
        password = "SecurePassword123!"

        # Register User A (Manager of Workspace A)
        token = await register_and_verify_user(client, "CRM Manager", user_email, password, "sales_manager")
        headers = {"Authorization": f"Bearer {token}"}

        # Create Workspace
        ws_res = await client.post(
            "/api/v1/workspaces",
            headers=headers,
            json={"name": "CRM Automation Workspace", "slug": f"crm-ws-{uid}"},
        )
        assert ws_res.status_code == 201, ws_res.text
        workspace_id = ws_res.json()["id"]

        # Create Lead 1: New uncontacted lead
        lead1_res = await client.post(
            "/api/v1/leads",
            headers=headers,
            params={"workspace_id": workspace_id},
            json={
                "company_name": "Alpha Corp",
                "contact_name": "Alice Alpha",
                "email": "alice@alpha.com",
                "deal_value": 3000.0,
            },
        )
        assert lead1_res.status_code == 201, lead1_res.text
        lead1_id = lead1_res.json()["id"]

        # Create Lead 2: Proposal stage lead
        lead2_res = await client.post(
            "/api/v1/leads",
            headers=headers,
            params={"workspace_id": workspace_id},
            json={
                "company_name": "Beta Inc",
                "contact_name": "Bob Beta",
                "email": "bob@beta.com",
                "deal_value": 12000.0,
            },
        )
        assert lead2_res.status_code == 201, lead2_res.text
        lead2_id = lead2_res.json()["id"]

        # Update Lead 2 status to proposal
        upd_res = await client.patch(
            f"/api/v1/leads/{lead2_id}",
            headers=headers,
            params={"workspace_id": workspace_id},
            json={"lead_status": "proposal"},
        )
        assert upd_res.status_code == 200, upd_res.text

        # Create Lead 3: Lead with an overdue follow-up
        lead3_res = await client.post(
            "/api/v1/leads",
            headers=headers,
            params={"workspace_id": workspace_id},
            json={
                "company_name": "Gamma Tech",
                "contact_name": "Gary Gamma",
                "email": "gary@gamma.com",
            },
        )
        assert lead3_res.status_code == 201, lead3_res.text
        lead3_id = lead3_res.json()["id"]

        # Schedule an overdue follow-up for Lead 3
        overdue_due = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        fu_res = await client.post(
            "/api/v1/follow-ups",
            headers=headers,
            params={"workspace_id": workspace_id},
            json={
                "title": "Call Gary to confirm quote",
                "due_date": overdue_due,
                "lead_id": lead3_id,
                "priority": "high",
            },
        )
        assert fu_res.status_code == 201, fu_res.text

        # Query GET /api/v1/crm/lead-recommendations
        rec_res = await client.get(
            "/api/v1/crm/lead-recommendations",
            headers=headers,
            params={"workspace_id": workspace_id},
        )
        assert rec_res.status_code == 200, rec_res.text
        recs = rec_res.json()
        assert len(recs) >= 3

        # Lead 3 has an overdue follow-up, so it should have urgency 'urgent' and trigger_type 'overdue_followup'
        urgent_rec = next((r for r in recs if r["lead_id"] == lead3_id), None)
        assert urgent_rec is not None
        assert urgent_rec["urgency"] == "urgent"
        assert urgent_rec["trigger_type"] == "overdue_followup"
        assert "Overdue Follow-up" in urgent_rec["title"]

        # Lead 2 is in proposal stage
        prop_rec = next((r for r in recs if r["lead_id"] == lead2_id), None)
        assert prop_rec is not None
        assert prop_rec["lead_status"] == "proposal"
        assert prop_rec["suggested_action"] in ("schedule_followup", "schedule_meeting")

        # Query GET /api/v1/crm/summary to verify lead_recommendations is included
        sum_res = await client.get(
            "/api/v1/crm/summary",
            headers=headers,
            params={"workspace_id": workspace_id},
        )
        assert sum_res.status_code == 200, sum_res.text
        summary_data = sum_res.json()
        assert "lead_recommendations" in summary_data
        assert len(summary_data["lead_recommendations"]) >= 3
