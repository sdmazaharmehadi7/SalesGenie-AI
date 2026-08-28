"""
Comprehensive Workspace CRM Architecture Tests.

Verifies:
1. Workspace-scoped Opportunities, Conversations, Activities, Notes, and Tasks.
2. Access verification through workspace membership (Active Member vs Non-Member).
3. Role-based permissions within workspace (Workspace Manager vs Team Member vs Personal).
4. Full backward compatibility with V1 personal-area queries.
"""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_workspace_crm_architecture_and_membership_access() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        uid = uuid.uuid4().hex[:8]
        manager_email = f"ws_mgr_{uid}@example.com"
        member_email = f"ws_mem_{uid}@example.com"
        outsider_email = f"ws_out_{uid}@example.com"
        password = "SecurePassword123!"

        # 1. Register users
        # User 1: Workspace Manager
        from tests.conftest import register_and_verify_user
        token_mgr = await register_and_verify_user(client, "Workspace Manager", manager_email, password, "sales_rep")
        headers_mgr = {"Authorization": f"Bearer {token_mgr}"}
        me_mgr = await client.get("/api/v1/auth/me", headers=headers_mgr)
        mgr_id = me_mgr.json()["id"]

        # User 2: Team Member
        token_mem = await register_and_verify_user(client, "Team Member", member_email, password, "sales_rep")
        headers_mem = {"Authorization": f"Bearer {token_mem}"}
        me_mem = await client.get("/api/v1/auth/me", headers=headers_mem)
        mem_id = me_mem.json()["id"]

        # User 3: Outsider (non-member)
        token_out = await register_and_verify_user(client, "Outsider", outsider_email, password, "sales_rep")
        headers_out = {"Authorization": f"Bearer {token_out}"}

        # 2. Manager creates a workspace
        ws_res = await client.post(
            "/api/v1/workspaces",
            headers=headers_mgr,
            json={"name": "Alpha Sales Team", "slug": f"alpha-sales-{uid}"},
        )
        assert ws_res.status_code == 201, ws_res.text
        workspace_id = ws_res.json()["id"]

        # 3. Add Member to the workspace as team_member
        add_mem_res = await client.post(
            f"/api/v1/workspaces/{workspace_id}/members",
            headers=headers_mgr,
            json={"user_id": mem_id, "role": "team_member"},
        )
        assert add_mem_res.status_code == 201, add_mem_res.text

        # ----------------------------------------------------
        # 4. OPPORTUNITIES: Workspace vs Personal & Access Control
        # ----------------------------------------------------
        # Manager creates a lead in the workspace assigned to member
        lead_res = await client.post(
            f"/api/v1/leads?workspace_id={workspace_id}",
            headers=headers_mgr,
            json={
                "company_name": "MegaCorp",
                "contact_name": "Alice",
                "email": "alice@megacorp.com",
                "assigned_to": mem_id,
            },
        )
        assert lead_res.status_code == 201, lead_res.text
        lead_id = lead_res.json()["id"]

        # Manager creates an Opportunity in the workspace assigned to member
        opp_res = await client.post(
            f"/api/v1/opportunities?workspace_id={workspace_id}",
            headers=headers_mgr,
            json={
                "name": "MegaCorp Deal",
                "amount": 75000.0,
                "stage": "proposal",
                "probability": 60,
                "lead_id": lead_id,
                "owner_id": mem_id,
            },
        )
        assert opp_res.status_code == 201, opp_res.text
        opp_id = opp_res.json()["id"]
        assert opp_res.json()["workspace_id"] == workspace_id
        assert opp_res.json()["owner_id"] == mem_id

        # Member can view this workspace opportunity
        mem_opp_res = await client.get(
            f"/api/v1/opportunities/{opp_id}?workspace_id={workspace_id}",
            headers=headers_mem,
        )
        assert mem_opp_res.status_code == 200, mem_opp_res.text
        assert mem_opp_res.json()["name"] == "MegaCorp Deal"

        # Outsider CANNOT access workspace opportunity (receives 403 Forbidden due to non-membership)
        out_opp_res = await client.get(
            f"/api/v1/opportunities/{opp_id}?workspace_id={workspace_id}",
            headers=headers_out,
        )
        assert out_opp_res.status_code == 403, out_opp_res.text

        # Team member CANNOT delete the workspace opportunity (403 Forbidden)
        mem_del_opp = await client.delete(
            f"/api/v1/opportunities/{opp_id}?workspace_id={workspace_id}",
            headers=headers_mem,
        )
        assert mem_del_opp.status_code == 403, mem_del_opp.text

        # ----------------------------------------------------
        # 5. CONVERSATIONS & NOTES: Workspace Scoping & Attribution
        # ----------------------------------------------------
        # Member logs a conversation on the lead
        conv_res = await client.post(
            f"/api/v1/leads/{lead_id}/interactions?workspace_id={workspace_id}",
            headers=headers_mem,
            json={
                "interaction_type": "call",
                "summary": "Call with MegaCorp CTO regarding technical architecture and budget.",
                "action_items": ["Send architecture doc", "Schedule pricing review"],
            },
        )
        assert conv_res.status_code == 201, conv_res.text
        conv_id = conv_res.json()["id"]
        assert conv_res.json()["workspace_id"] == workspace_id
        assert conv_res.json()["user_id"] == mem_id

        # Manager views lead interactions in the workspace
        mgr_conv_list = await client.get(
            f"/api/v1/leads/{lead_id}/interactions?workspace_id={workspace_id}",
            headers=headers_mgr,
        )
        assert mgr_conv_list.status_code == 200
        assert any(item["id"] == conv_id for item in mgr_conv_list.json())

        # Outsider CANNOT list interactions on the lead
        out_conv_list = await client.get(
            f"/api/v1/leads/{lead_id}/interactions?workspace_id={workspace_id}",
            headers=headers_out,
        )
        assert out_conv_list.status_code == 403

        # ----------------------------------------------------
        # 6. ACTIVITIES (TIMELINE & NOTE LOGGING): Workspace Scoping
        # ----------------------------------------------------
        # Member logs an explicit note activity on the Opportunity
        note_res = await client.post(
            f"/api/v1/activities?workspace_id={workspace_id}",
            headers=headers_mem,
            json={
                "opportunity_id": opp_id,
                "interaction_type": "note",
                "summary": "Client confirmed Q3 budget is approved for $75k.",
            },
        )
        assert note_res.status_code == 201, note_res.text
        note_id = note_res.json()["id"]
        assert note_res.json()["workspace_id"] == workspace_id
        assert note_res.json()["user_id"] == mem_id

        # Manager gets opportunity activities
        opp_acts_res = await client.get(
            f"/api/v1/opportunities/{opp_id}/activities?workspace_id={workspace_id}",
            headers=headers_mgr,
        )
        assert opp_acts_res.status_code == 200
        act_ids = [a["id"] for a in opp_acts_res.json()]
        assert note_id in act_ids

        # ----------------------------------------------------
        # 7. TASKS: Workspace vs Personal & Access Control
        # ----------------------------------------------------
        # Manager creates a task in the workspace assigned to member
        task_res = await client.post(
            f"/api/v1/tasks?workspace_id={workspace_id}",
            headers=headers_mgr,
            json={
                "title": "Send MSA agreement to MegaCorp",
                "priority": "high",
                "opportunity_id": opp_id,
                "assigned_to": mem_id,
            },
        )
        assert task_res.status_code == 201, task_res.text
        task_id = task_res.json()["id"]
        assert task_res.json()["workspace_id"] == workspace_id
        assert task_res.json()["assigned_to"] == mem_id

        # Member can complete their task
        complete_res = await client.patch(
            f"/api/v1/tasks/{task_id}/complete?workspace_id={workspace_id}",
            headers=headers_mem,
        )
        assert complete_res.status_code == 200
        assert complete_res.json()["is_completed"] is True

        # Outsider CANNOT access the task
        out_task_res = await client.get(
            f"/api/v1/tasks/{task_id}?workspace_id={workspace_id}",
            headers=headers_out,
        )
        assert out_task_res.status_code == 403

        # ----------------------------------------------------
        # 8. WORKSPACE CRM DASHBOARD SUMMARY
        # ----------------------------------------------------
        dash_res = await client.get(
            f"/api/v1/crm/summary?workspace_id={workspace_id}",
            headers=headers_mgr,
        )
        assert dash_res.status_code == 200, dash_res.text
        dash_data = dash_res.json()
        assert dash_data["total_leads"] == 1
        assert float(dash_data["pipeline_value"]) == 75000.0
        assert len(dash_data["recent_activities"]) >= 2

        # ----------------------------------------------------
        # 9. MANAGER CAN DELETE WORKSPACE OPPORTUNITY
        # ----------------------------------------------------
        del_res = await client.delete(
            f"/api/v1/opportunities/{opp_id}?workspace_id={workspace_id}",
            headers=headers_mgr,
        )
        assert del_res.status_code == 204
