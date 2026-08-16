"""
End-to-End Multi-User Data Isolation and Security Tests.

Verifies that:
1. Every user has completely isolated CRM data (leads, accounts, contacts, opportunities, tasks, pipeline board, dashboard).
2. User A cannot see or modify User B's data via list endpoints or direct IDOR attempts.
3. Kanban board drag & drop updates persist to the database and remain scoped to the deal owner.
4. Newly registered users start with zero mock/sample data and receive clean empty states.
"""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_complete_multi_user_isolation_and_security() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Unique email suffix per test run
        uid = uuid.uuid4().hex[:8]
        user_a_email = f"user_a_{uid}@example.com"
        user_b_email = f"user_b_{uid}@example.com"
        user_c_email = f"user_c_{uid}@example.com"
        password = "SecurePassword123!"

        # 1. Register User A
        res_a = await client.post(
            "/api/v1/auth/register",
            json={"name": "User Alpha", "email": user_a_email, "password": password, "role": "sales_rep"},
        )
        assert res_a.status_code == 201, res_a.text
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Register User B
        res_b = await client.post(
            "/api/v1/auth/register",
            json={"name": "User Beta", "email": user_b_email, "password": password, "role": "sales_rep"},
        )
        assert res_b.status_code == 201, res_b.text
        token_b = res_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # ----------------------------------------------------
        # User A creates entities
        # ----------------------------------------------------
        # Lead A
        lead_a_res = await client.post(
            "/api/v1/leads",
            headers=headers_a,
            json={"company_name": "Alpha Corp", "contact_name": "Alice A", "email": "alice@alpha.com"},
        )
        assert lead_a_res.status_code == 201, lead_a_res.text
        lead_a_id = lead_a_res.json()["id"]

        # Account A
        acc_a_res = await client.post(
            "/api/v1/accounts",
            headers=headers_a,
            json={"name": "Alpha Enterprise", "industry": "Technology"},
        )
        assert acc_a_res.status_code == 201, acc_a_res.text
        acc_a_id = acc_a_res.json()["id"]

        # Contact A
        con_a_res = await client.post(
            "/api/v1/contacts",
            headers=headers_a,
            json={"first_name": "Alice", "last_name": "Alpha", "email": "alice@alpha.com", "account_id": acc_a_id},
        )
        assert con_a_res.status_code == 201, con_a_res.text
        con_a_id = con_a_res.json()["id"]

        # Opportunity A ($50,000 in proposal stage)
        opp_a_res = await client.post(
            "/api/v1/opportunities",
            headers=headers_a,
            json={
                "name": "Alpha Expansion Deal",
                "amount": 50000.0,
                "stage": "proposal",
                "probability": 70,
                "account_id": acc_a_id,
            },
        )
        assert opp_a_res.status_code == 201, opp_a_res.text
        opp_a_id = opp_a_res.json()["id"]

        # Task A
        task_a_res = await client.post(
            "/api/v1/tasks",
            headers=headers_a,
            json={"title": "Prepare Alpha proposal slide deck", "priority": "high", "account_id": acc_a_id},
        )
        assert task_a_res.status_code == 201, task_a_res.text
        task_a_id = task_a_res.json()["id"]

        # ----------------------------------------------------
        # User B creates entities
        # ----------------------------------------------------
        # Lead B
        lead_b_res = await client.post(
            "/api/v1/leads",
            headers=headers_b,
            json={"company_name": "Beta Inc", "contact_name": "Bob B", "email": "bob@beta.com"},
        )
        assert lead_b_res.status_code == 201, lead_b_res.text
        lead_b_id = lead_b_res.json()["id"]

        # Account B
        acc_b_res = await client.post(
            "/api/v1/accounts",
            headers=headers_b,
            json={"name": "Beta Systems", "industry": "Healthcare"},
        )
        assert acc_b_res.status_code == 201, acc_b_res.text
        acc_b_id = acc_b_res.json()["id"]

        # Contact B
        con_b_res = await client.post(
            "/api/v1/contacts",
            headers=headers_b,
            json={"first_name": "Bob", "last_name": "Beta", "email": "bob@beta.com", "account_id": acc_b_id},
        )
        assert con_b_res.status_code == 201, con_b_res.text
        con_b_id = con_b_res.json()["id"]

        # Opportunity B ($120,000 in negotiation stage)
        opp_b_res = await client.post(
            "/api/v1/opportunities",
            headers=headers_b,
            json={
                "name": "Beta Global Contract",
                "amount": 120000.0,
                "stage": "negotiation",
                "probability": 85,
                "account_id": acc_b_id,
            },
        )
        assert opp_b_res.status_code == 201, opp_b_res.text
        opp_b_id = opp_b_res.json()["id"]

        # Task B
        task_b_res = await client.post(
            "/api/v1/tasks",
            headers=headers_b,
            json={"title": "Review Beta MSA terms", "priority": "urgent", "account_id": acc_b_id},
        )
        assert task_b_res.status_code == 201, task_b_res.text
        task_b_id = task_b_res.json()["id"]

        # ----------------------------------------------------
        # 3. Verify List Isolation (User A sees ONLY A)
        # ----------------------------------------------------
        # Leads
        leads_a = (await client.get("/api/v1/leads", headers=headers_a)).json()
        assert any(item["id"] == lead_a_id for item in leads_a["items"])
        assert not any(item["id"] == lead_b_id for item in leads_a["items"])

        # Accounts
        accs_a = (await client.get("/api/v1/accounts", headers=headers_a)).json()
        assert any(item["id"] == acc_a_id for item in accs_a["items"])
        assert not any(item["id"] == acc_b_id for item in accs_a["items"])

        # Contacts
        cons_a = (await client.get("/api/v1/contacts", headers=headers_a)).json()
        assert any(item["id"] == con_a_id for item in cons_a["items"])
        assert not any(item["id"] == con_b_id for item in cons_a["items"])

        # Opportunities
        opps_a = (await client.get("/api/v1/opportunities", headers=headers_a)).json()
        assert any(item["id"] == opp_a_id for item in opps_a["items"])
        assert not any(item["id"] == opp_b_id for item in opps_a["items"])

        # Pipeline Kanban Board
        board_a = (await client.get("/api/v1/opportunities/pipeline/board", headers=headers_a)).json()
        all_board_a_ids = [d["id"] for col in board_a["columns"] for d in col["opportunities"]]
        assert opp_a_id in all_board_a_ids
        assert opp_b_id not in all_board_a_ids
        assert float(board_a["total_pipeline_value"]) == 50000.0

        # Tasks
        tasks_a = (await client.get("/api/v1/tasks", headers=headers_a)).json()
        assert any(item["id"] == task_a_id for item in tasks_a["items"])
        assert not any(item["id"] == task_b_id for item in tasks_a["items"])

        # CRM Dashboard Summary
        crm_a = (await client.get("/api/v1/crm/summary", headers=headers_a)).json()
        assert crm_a["total_leads"] == 1
        assert crm_a["total_accounts"] == 1
        assert crm_a["total_contacts"] == 1
        assert float(crm_a["pipeline_value"]) == 50000.0

        # ----------------------------------------------------
        # 4. Verify List Isolation (User B sees ONLY B)
        # ----------------------------------------------------
        # Leads
        leads_b = (await client.get("/api/v1/leads", headers=headers_b)).json()
        assert any(item["id"] == lead_b_id for item in leads_b["items"])
        assert not any(item["id"] == lead_a_id for item in leads_b["items"])

        # Accounts
        accs_b = (await client.get("/api/v1/accounts", headers=headers_b)).json()
        assert any(item["id"] == acc_b_id for item in accs_b["items"])
        assert not any(item["id"] == acc_a_id for item in accs_b["items"])

        # Contacts
        cons_b = (await client.get("/api/v1/contacts", headers=headers_b)).json()
        assert any(item["id"] == con_b_id for item in cons_b["items"])
        assert not any(item["id"] == con_a_id for item in cons_b["items"])

        # Opportunities
        opps_b = (await client.get("/api/v1/opportunities", headers=headers_b)).json()
        assert any(item["id"] == opp_b_id for item in opps_b["items"])
        assert not any(item["id"] == opp_a_id for item in opps_b["items"])

        # Pipeline Kanban Board
        board_b = (await client.get("/api/v1/opportunities/pipeline/board", headers=headers_b)).json()
        all_board_b_ids = [d["id"] for col in board_b["columns"] for d in col["opportunities"]]
        assert opp_b_id in all_board_b_ids
        assert opp_a_id not in all_board_b_ids
        assert float(board_b["total_pipeline_value"]) == 120000.0

        # Tasks
        tasks_b = (await client.get("/api/v1/tasks", headers=headers_b)).json()
        assert any(item["id"] == task_b_id for item in tasks_b["items"])
        assert not any(item["id"] == task_a_id for item in tasks_b["items"])

        # CRM Dashboard Summary
        crm_b = (await client.get("/api/v1/crm/summary", headers=headers_b)).json()
        assert crm_b["total_leads"] == 1
        assert crm_b["total_accounts"] == 1
        assert crm_b["total_contacts"] == 1
        assert float(crm_b["pipeline_value"]) == 120000.0

        # ----------------------------------------------------
        # 5. Security & IDOR Verification: User B cannot access User A's data
        # ----------------------------------------------------
        assert (await client.get(f"/api/v1/leads/{lead_a_id}", headers=headers_b)).status_code == 404
        assert (await client.patch(f"/api/v1/leads/{lead_a_id}", headers=headers_b, json={"company_name": "Hacked"})).status_code == 404
        assert (await client.get(f"/api/v1/accounts/{acc_a_id}", headers=headers_b)).status_code == 404
        assert (await client.patch(f"/api/v1/accounts/{acc_a_id}", headers=headers_b, json={"name": "Hacked"})).status_code == 404
        assert (await client.delete(f"/api/v1/accounts/{acc_a_id}", headers=headers_b)).status_code == 404
        assert (await client.get(f"/api/v1/contacts/{con_a_id}", headers=headers_b)).status_code == 404
        assert (await client.patch(f"/api/v1/contacts/{con_a_id}", headers=headers_b, json={"first_name": "Hacked"})).status_code == 404
        assert (await client.delete(f"/api/v1/contacts/{con_a_id}", headers=headers_b)).status_code == 404
        assert (await client.get(f"/api/v1/opportunities/{opp_a_id}", headers=headers_b)).status_code == 404
        assert (await client.patch(f"/api/v1/opportunities/{opp_a_id}/stage", headers=headers_b, json={"stage": "won"})).status_code == 404
        assert (await client.delete(f"/api/v1/opportunities/{opp_a_id}", headers=headers_b)).status_code == 404
        assert (await client.get(f"/api/v1/tasks/{task_a_id}", headers=headers_b)).status_code == 404
        assert (await client.patch(f"/api/v1/tasks/{task_a_id}/complete", headers=headers_b)).status_code == 404
        assert (await client.delete(f"/api/v1/tasks/{task_a_id}", headers=headers_b)).status_code == 404

        # ----------------------------------------------------
        # 6. Kanban Drag and Drop Stage Transition Persistence
        # ----------------------------------------------------
        move_res = await client.patch(
            f"/api/v1/opportunities/{opp_a_id}/stage",
            headers=headers_a,
            json={"stage": "negotiation"},
        )
        assert move_res.status_code == 200
        assert move_res.json()["stage"] == "negotiation"

        # Verify board reflects stage move
        board_a_updated = (await client.get("/api/v1/opportunities/pipeline/board", headers=headers_a)).json()
        neg_column = next(c for c in board_a_updated["columns"] if c["stage"] == "negotiation")
        assert any(d["id"] == opp_a_id for d in neg_column["opportunities"])

        # ----------------------------------------------------
        # 7. Empty State for Brand New User C
        # ----------------------------------------------------
        res_c = await client.post(
            "/api/v1/auth/register",
            json={"name": "User Charlie", "email": user_c_email, "password": password, "role": "sales_rep"},
        )
        assert res_c.status_code == 201
        headers_c = {"Authorization": f"Bearer {res_c.json()['access_token']}"}

        # User C should see 0 records across all CRM resources (no mock/sample data)
        assert (await client.get("/api/v1/leads", headers=headers_c)).json()["total"] == 0
        assert (await client.get("/api/v1/accounts", headers=headers_c)).json()["total"] == 0
        assert (await client.get("/api/v1/contacts", headers=headers_c)).json()["total"] == 0
        assert (await client.get("/api/v1/opportunities", headers=headers_c)).json()["total"] == 0
        assert (await client.get("/api/v1/tasks", headers=headers_c)).json()["total"] == 0

        board_c = (await client.get("/api/v1/opportunities/pipeline/board", headers=headers_c)).json()
        assert board_c["total_deals_count"] == 0
        assert float(board_c["total_pipeline_value"]) == 0.0

        crm_c = (await client.get("/api/v1/crm/summary", headers=headers_c)).json()
        assert crm_c["total_leads"] == 0
        assert crm_c["total_accounts"] == 0
        assert crm_c["total_contacts"] == 0
        assert float(crm_c["pipeline_value"]) == 0.0
        assert len(crm_c["upcoming_tasks"]) == 0
        assert len(crm_c["recent_activities"]) == 0
