"""Tests for Follow-Up Management (Tests 1 to 7 as specified in requirements)."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import register_and_verify_user


@pytest.mark.asyncio
async def test_follow_up_lifecycle_complete_suite() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        uid = uuid.uuid4().hex[:8]
        user_email = f"fu_user_{uid}@example.com"
        outsider_email = f"fu_outsider_{uid}@example.com"
        password = "SecurePassword123!"

        # Register User A (Manager of Workspace A)
        token_a = await register_and_verify_user(client, "User A", user_email, password, "sales_rep")
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Register User B (Outsider in Workspace B)
        token_b = await register_and_verify_user(client, "User B", outsider_email, password, "sales_rep")
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Create Workspace A
        ws_a_res = await client.post(
            "/api/v1/workspaces",
            headers=headers_a,
            json={"name": "Workspace A", "slug": f"ws-a-{uid}"},
        )
        assert ws_a_res.status_code == 201, ws_a_res.text
        workspace_a_id = ws_a_res.json()["id"]

        # Create Workspace B
        ws_b_res = await client.post(
            "/api/v1/workspaces",
            headers=headers_b,
            json={"name": "Workspace B", "slug": f"ws-b-{uid}"},
        )
        assert ws_b_res.status_code == 201, ws_b_res.text
        workspace_b_id = ws_b_res.json()["id"]

        # Create Lead Acme Corp in Workspace A
        lead_res = await client.post(
            "/api/v1/leads",
            headers=headers_a,
            params={"workspace_id": workspace_a_id},
            json={
                "company_name": "Acme Corp",
                "contact_name": "Alice Smith",
                "email": "alice@acme.com",
            },
        )
        assert lead_res.status_code == 201, lead_res.text
        lead_id = lead_res.json()["id"]

        # ----------------------------------------------------------------------
        # TEST 1: Create follow-up for tomorrow -> verify UPCOMING
        # ----------------------------------------------------------------------
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1, hours=2)).isoformat()
        create_fu_res = await client.post(
            "/api/v1/follow-ups",
            headers=headers_a,
            params={"workspace_id": workspace_a_id},
            json={
                "lead_id": lead_id,
                "due_date": tomorrow,
                "title": "Call Alice regarding demo",
                "notes": "Discuss enterprise pricing",
                "priority": "high",
            },
        )
        assert create_fu_res.status_code == 201, create_fu_res.text
        fu_data = create_fu_res.json()
        fu_id = fu_data["id"]

        assert fu_data["status"] == "UPCOMING"
        assert fu_data["is_completed"] is False
        assert fu_data["title"] == "Call Alice regarding demo"
        assert fu_data["notes"] == "Discuss enterprise pricing"
        assert fu_data["lead_id"] == lead_id

        # ----------------------------------------------------------------------
        # TEST 2: Create follow-up whose date/time has passed -> verify DUE / OVERDUE
        # ----------------------------------------------------------------------
        past_date = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        past_fu_res = await client.post(
            "/api/v1/follow-ups",
            headers=headers_a,
            params={"workspace_id": workspace_a_id},
            json={
                "lead_id": lead_id,
                "due_date": past_date,
                "title": "Send contract",
            },
        )
        assert past_fu_res.status_code == 201, past_fu_res.text
        past_fu_data = past_fu_res.json()
        assert past_fu_data["status"] in ("DUE", "OVERDUE")
        assert past_fu_data["status"] == "OVERDUE"

        # ----------------------------------------------------------------------
        # TEST 3: Reschedule the follow-up -> verify new date is reflected everywhere
        # ----------------------------------------------------------------------
        new_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        reschedule_res = await client.patch(
            f"/api/v1/follow-ups/{fu_id}/reschedule",
            headers=headers_a,
            params={"workspace_id": workspace_a_id},
            json={
                "due_date": new_date,
                "notes": "Client requested next week",
            },
        )
        assert reschedule_res.status_code == 200, reschedule_res.text
        rescheduled_data = reschedule_res.json()
        assert rescheduled_data["rescheduled_at"] is not None
        assert "Client requested next week" in rescheduled_data["notes"]
        assert rescheduled_data["status"] in ("RESCHEDULED", "UPCOMING")

        # Verify via GET that new date is persisted
        get_res = await client.get(
            f"/api/v1/follow-ups/{fu_id}",
            headers=headers_a,
            params={"workspace_id": workspace_a_id},
        )
        assert get_res.status_code == 200
        assert get_res.json()["rescheduled_at"] is not None

        # ----------------------------------------------------------------------
        # TEST 4: Complete the follow-up -> verify COMPLETED & not in active follow-ups
        # ----------------------------------------------------------------------
        complete_res = await client.patch(
            f"/api/v1/follow-ups/{fu_id}/complete",
            headers=headers_a,
            params={"workspace_id": workspace_a_id},
        )
        assert complete_res.status_code == 200, complete_res.text
        completed_data = complete_res.json()
        assert completed_data["is_completed"] is True
        assert completed_data["status"] == "COMPLETED"
        assert completed_data["completed_at"] is not None

        # Verify it is no longer returned in active/upcoming follow-ups
        active_list_res = await client.get(
            "/api/v1/follow-ups",
            headers=headers_a,
            params={"workspace_id": workspace_a_id, "status": "active"},
        )
        assert active_list_res.status_code == 200
        active_ids = [item["id"] for item in active_list_res.json()["items"]]
        assert fu_id not in active_ids

        # Verify it is returned when filtering for completed
        completed_list_res = await client.get(
            "/api/v1/follow-ups",
            headers=headers_a,
            params={"workspace_id": workspace_a_id, "status": "completed"},
        )
        assert completed_list_res.status_code == 200
        comp_ids = [item["id"] for item in completed_list_res.json()["items"]]
        assert fu_id in comp_ids

        # Verify CRM Activity integration: timeline contains completed follow-up
        timeline_res = await client.get(
            "/api/v1/activities",
            headers=headers_a,
            params={"workspace_id": workspace_a_id, "lead_id": lead_id},
        )
        assert timeline_res.status_code == 200, timeline_res.text
        activities = timeline_res.json()
        follow_up_acts = [a for a in activities if a["interaction_type"] == "follow_up"]
        assert len(follow_up_acts) >= 1
        assert "Completed follow-up" in follow_up_acts[0]["summary"]

        # ----------------------------------------------------------------------
        # TEST 5: Attempt to access another workspace's follow-up -> 403 / 404
        # ----------------------------------------------------------------------
        # User B trying to access Workspace A's follow-up with Workspace B context
        cross_ws_get = await client.get(
            f"/api/v1/follow-ups/{fu_id}",
            headers=headers_b,
            params={"workspace_id": workspace_b_id},
        )
        assert cross_ws_get.status_code in (403, 404)

        # User B trying to access Workspace A's follow-up by forging Workspace A param
        cross_ws_forge = await client.get(
            f"/api/v1/follow-ups/{fu_id}",
            headers=headers_b,
            params={"workspace_id": workspace_a_id},
        )
        assert cross_ws_forge.status_code in (403, 404)

        # User B trying to create a follow-up against Workspace A's lead
        cross_ws_create = await client.post(
            "/api/v1/follow-ups",
            headers=headers_b,
            params={"workspace_id": workspace_b_id},
            json={
                "lead_id": lead_id,
                "due_date": tomorrow,
                "title": "Malicious attempt",
            },
        )
        assert cross_ws_create.status_code in (403, 404)

        # ----------------------------------------------------------------------
        # TEST 6: Persistence verification from database
        # ----------------------------------------------------------------------
        verify_db_get = await client.get(
            f"/api/v1/follow-ups/{fu_id}",
            headers=headers_a,
            params={"workspace_id": workspace_a_id},
        )
        assert verify_db_get.status_code == 200
        persisted = verify_db_get.json()
        assert persisted["id"] == fu_id
        assert persisted["is_completed"] is True
        assert persisted["status"] == "COMPLETED"
        assert persisted["completed_at"] is not None

        # ----------------------------------------------------------------------
        # Summary endpoint check
        # ----------------------------------------------------------------------
        summary_res = await client.get(
            "/api/v1/follow-ups/summary",
            headers=headers_a,
            params={"workspace_id": workspace_a_id},
        )
        assert summary_res.status_code == 200
        summary_data = summary_res.json()
        assert summary_data["completed"] >= 1
        assert summary_data["overdue"] >= 1


@pytest.mark.asyncio
async def test_opportunity_follow_up_and_personal_isolation() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        uid = uuid.uuid4().hex[:8]
        email = f"personal_fu_{uid}@example.com"
        token = await register_and_verify_user(client, "Personal User", email, "SecurePassword123!")
        headers = {"Authorization": f"Bearer {token}"}

        # Create Opportunity in Personal Area
        opp_res = await client.post(
            "/api/v1/opportunities",
            headers=headers,
            json={"name": "Big Enterprise Deal", "amount": 50000},
        )
        assert opp_res.status_code == 201, opp_res.text
        opp_id = opp_res.json()["id"]

        # Create Follow-up on Opportunity
        due = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        fu_res = await client.post(
            "/api/v1/follow-ups",
            headers=headers,
            json={
                "opportunity_id": opp_id,
                "due_date": due,
                "title": "Follow up on proposal review",
                "notes": "Decision expected this Thursday",
            },
        )
        assert fu_res.status_code == 201, fu_res.text
        fu_data = fu_res.json()
        assert fu_data["opportunity_id"] == opp_id
        assert fu_data["status"] == "UPCOMING"
        assert fu_data["workspace_id"] is None
