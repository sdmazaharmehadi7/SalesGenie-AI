import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_live_data_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register or login
        reg_res = await client.post("/api/v1/auth/register", json={
            "name": "Live Test Rep",
            "email": "live_test_pg_verification@example.com",
            "password": "Password123!",
            "role": "sales_rep",
        })
        if reg_res.status_code == 201:
            token = reg_res.json()["access_token"]
        else:
            login_res = await client.post("/api/v1/auth/login", data={
                "username": "live_test_pg_verification@example.com",
                "password": "Password123!"
            })
            token = login_res.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}

        # 2. Test GET /leads (fetches real PostgreSQL leads)
        leads_res = await client.get("/api/v1/leads", headers=headers)
        assert leads_res.status_code == 200
        leads_data = leads_res.json()
        print(f"\n[LEADS] Fetched {len(leads_data['items'])} leads from PostgreSQL (total: {leads_data['total']})")

        # 3. Test POST & GET /accounts
        acc_create = await client.post("/api/v1/accounts", json={
            "name": "Live Test Corp",
            "industry": "FinTech",
            "company_size": "51-200",
            "website": "https://livetest.io",
            "phone": "+1-555-0199",
            "description": "Enterprise financial software provider."
        }, headers=headers)
        assert acc_create.status_code == 201
        acc_id = acc_create.json()["id"]

        acc_list = await client.get("/api/v1/accounts", headers=headers)
        assert acc_list.status_code == 200
        assert acc_list.json()["total"] >= 1
        print(f"[ACCOUNTS] Account created and listed from PostgreSQL (ID: {acc_id})")

        # 4. Test POST & GET /contacts
        con_create = await client.post("/api/v1/contacts", json={
            "first_name": "Alexander",
            "last_name": "Pierce",
            "email": "alex.pierce@livetest.io",
            "job_title": "VP of Revenue",
            "account_id": acc_id,
        }, headers=headers)
        assert con_create.status_code == 201
        con_id = con_create.json()["id"]

        con_list = await client.get(f"/api/v1/accounts/{acc_id}/contacts", headers=headers)
        assert con_list.status_code == 200
        print(f"[CONTACTS] Contact created under Account (ID: {con_id})")

        # 5. Test POST & GET /opportunities
        opp_create = await client.post("/api/v1/opportunities", json={
            "name": "Live Test Corp - Core Platform",
            "amount": 95000.0,
            "stage": "qualified",
            "probability": 40,
            "account_id": acc_id,
            "contact_id": con_id,
            "notes": "Decision maker identified."
        }, headers=headers)
        assert opp_create.status_code == 201
        opp_id = opp_create.json()["id"]

        # 6. Test PATCH stage
        stage_patch = await client.patch(f"/api/v1/opportunities/{opp_id}/stage", json={"stage": "proposal"}, headers=headers)
        assert stage_patch.status_code == 200
        assert stage_patch.json()["stage"] == "proposal"
        print(f"[OPPORTUNITIES] Opportunity stage advanced to proposal (ID: {opp_id})")

        # 7. Test Pipeline Board
        board_res = await client.get("/api/v1/opportunities/pipeline/board", headers=headers)
        assert board_res.status_code == 200
        board = board_res.json()
        assert len(board["columns"]) == 7
        assert float(board["total_pipeline_value"]) >= 95000.0
        print(f"[PIPELINE] Kanban Board returned with total value: ${board['total_pipeline_value']}")

        # 8. Test Tasks
        task_create = await client.post("/api/v1/tasks", json={
            "title": "Send Master Services Agreement",
            "priority": "high",
            "opportunity_id": opp_id,
            "account_id": acc_id,
        }, headers=headers)
        assert task_create.status_code == 201
        task_id = task_create.json()["id"]

        task_toggle = await client.patch(f"/api/v1/tasks/{task_id}/complete", headers=headers)
        assert task_toggle.status_code == 200
        assert task_toggle.json()["is_completed"] is True
        print(f"[TASKS] Task created and toggled completed in PostgreSQL (ID: {task_id})")

        # 9. Test Activity Logging & Timeline
        act_create = await client.post("/api/v1/activities", json={
            "opportunity_id": opp_id,
            "account_id": acc_id,
            "contact_id": con_id,
            "interaction_type": "call",
            "summary": "Live test phone call with VP Pierce.",
            "action_items": ["Send contract draft"],
        }, headers=headers)
        assert act_create.status_code == 201

        opp_timeline = await client.get(f"/api/v1/opportunities/{opp_id}/activities", headers=headers)
        assert opp_timeline.status_code == 200
        print(f"[ACTIVITIES] Activity logged and timeline retrieved ({len(opp_timeline.json())} entries)")

        # 10. Test CRM Summary & Forecast
        crm_sum = await client.get("/api/v1/crm/summary", headers=headers)
        assert crm_sum.status_code == 200
        sum_data = crm_sum.json()
        assert sum_data["total_accounts"] >= 1
        assert sum_data["total_contacts"] >= 1
        assert sum_data["open_opportunities_count"] >= 1
        print(f"[CRM DASHBOARD] Live Summary: {sum_data['total_accounts']} accounts, {sum_data['total_contacts']} contacts, ${sum_data['pipeline_value']} pipeline")

        crm_fore = await client.get("/api/v1/crm/forecast", headers=headers)
        assert crm_fore.status_code == 200
        print(f"[PREDICTIVE AI] Forecast API response verified (has_sufficient_data: {crm_fore.json()['has_sufficient_data']})")

