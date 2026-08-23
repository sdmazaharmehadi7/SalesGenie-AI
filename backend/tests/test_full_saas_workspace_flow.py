import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.user import User, UserRole
from app.models.workspace import WorkspaceRole


@pytest.mark.asyncio
async def test_full_saas_multi_workspace_crm_flow():
    """
    Test scenario:
    1. Register User A, User B, User C
    2. User A creates Workspace A -> User A is Manager
    3. User A invites User B to Workspace A -> User B accepts invitation -> User B is Team Member
    4. User C creates Workspace B -> User C is Manager
    5. User A creates Lead A1, Lead A2 in Workspace A
    6. User C creates Lead B1, Lead B2 in Workspace B
    7. Verify Data Isolation:
       - Querying with Workspace A returns only A1, A2
       - Querying with Workspace B returns only B1, B2
       - User B (Team Member) cannot access Workspace B (403 Forbidden)
       - User C cannot access Workspace A (403 Forbidden)
    8. Verify Personal Area isolation:
       - User A creates Lead PersonalA in Personal Area (no workspace_id)
       - Querying Workspace A does NOT return Lead PersonalA
       - Querying Personal Area returns only Lead PersonalA
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Register User A, User B, User C
        unique = uuid.uuid4().hex[:6]
        
        reg_a = await client.post("/api/v1/auth/register", json={
            "name": "User A", "email": f"user_a_{unique}@example.com", "password": "Password123!"
        })
        assert reg_a.status_code == 201, reg_a.text
        token_a = reg_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        reg_b = await client.post("/api/v1/auth/register", json={
            "name": "User B", "email": f"user_b_{unique}@example.com", "password": "Password123!"
        })
        assert reg_b.status_code == 201, reg_b.text
        token_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        reg_c = await client.post("/api/v1/auth/register", json={
            "name": "User C", "email": f"user_c_{unique}@example.com", "password": "Password123!"
        })
        assert reg_c.status_code == 201, reg_c.text
        token_c = reg_c.json()["access_token"]
        headers_c = {"Authorization": f"Bearer {token_c}"}

        # Step 2: User A creates Workspace A
        ws_a_res = await client.post("/api/v1/workspaces", headers=headers_a, json={
            "name": "Workspace A", "slug": f"workspace-a-{unique}"
        })
        assert ws_a_res.status_code == 201
        ws_a_id = ws_a_res.json()["id"]

        # Step 3: User A invites User B to Workspace A
        inv_res = await client.post(f"/api/v1/workspaces/{ws_a_id}/invitations", headers=headers_a, json={
            "email": f"user_b_{unique}@example.com",
            "role": "team_member"
        })
        assert inv_res.status_code == 201
        inv_token = inv_res.json()["token"]

        # User B accepts invitation
        accept_res = await client.post("/api/v1/workspaces/invitations/accept", headers=headers_b, json={
            "token": inv_token
        })
        assert accept_res.status_code == 200
        assert accept_res.json()["role"] == "team_member"

        # Step 4: User C creates Workspace B
        ws_b_res = await client.post("/api/v1/workspaces", headers=headers_c, json={
            "name": "Workspace B", "slug": f"workspace-b-{unique}"
        })
        assert ws_b_res.status_code == 201
        ws_b_id = ws_b_res.json()["id"]

        # Step 5: User A creates Lead A1, Lead A2 in Workspace A
        l_a1 = await client.post(f"/api/v1/leads?workspace_id={ws_a_id}", headers=headers_a, json={
            "company_name": "Lead A1 Corp", "lead_status": "new"
        })
        assert l_a1.status_code == 201

        l_a2 = await client.post(f"/api/v1/leads?workspace_id={ws_a_id}", headers=headers_a, json={
            "company_name": "Lead A2 Corp", "lead_status": "qualified"
        })
        assert l_a2.status_code == 201

        # Step 6: User C creates Lead B1, Lead B2 in Workspace B
        l_b1 = await client.post(f"/api/v1/leads?workspace_id={ws_b_id}", headers=headers_c, json={
            "company_name": "Lead B1 Enterprise", "lead_status": "proposal"
        })
        assert l_b1.status_code == 201

        l_b2 = await client.post(f"/api/v1/leads?workspace_id={ws_b_id}", headers=headers_c, json={
            "company_name": "Lead B2 Enterprise", "lead_status": "negotiation"
        })
        assert l_b2.status_code == 201

        # Step 7: Verify Workspace A leads
        get_a = await client.get(f"/api/v1/leads?workspace_id={ws_a_id}", headers=headers_a)
        assert get_a.status_code == 200
        a_companies = [item["company_name"] for item in get_a.json()["items"]]
        assert "Lead A1 Corp" in a_companies
        assert "Lead A2 Corp" in a_companies
        assert "Lead B1 Enterprise" not in a_companies
        assert "Lead B2 Enterprise" not in a_companies

        # Verify Workspace B leads
        get_b = await client.get(f"/api/v1/leads?workspace_id={ws_b_id}", headers=headers_c)
        assert get_b.status_code == 200
        b_companies = [item["company_name"] for item in get_b.json()["items"]]
        assert "Lead B1 Enterprise" in b_companies
        assert "Lead B2 Enterprise" in b_companies
        assert "Lead A1 Corp" not in b_companies
        assert "Lead A2 Corp" not in b_companies

        # Step 8: Cross-workspace access denial:
        # User C tries to access Workspace A -> 403 Forbidden
        denied_c = await client.get(f"/api/v1/leads?workspace_id={ws_a_id}", headers=headers_c)
        assert denied_c.status_code == 403

        # User B (member of A) tries to access Workspace B -> 403 Forbidden
        denied_b = await client.get(f"/api/v1/leads?workspace_id={ws_b_id}", headers=headers_b)
        assert denied_b.status_code == 403

        # Step 9: Personal Area separation:
        # User A creates personal lead
        pers_a = await client.post("/api/v1/leads", headers=headers_a, json={
            "company_name": "Personal A Solo", "lead_status": "new"
        })
        assert pers_a.status_code == 201

        # In Personal Area (no workspace_id), User A sees Personal A Solo
        get_pers = await client.get("/api/v1/leads", headers=headers_a)
        assert get_pers.status_code == 200
        pers_names = [item["company_name"] for item in get_pers.json()["items"]]
        assert "Personal A Solo" in pers_names
        assert "Lead A1 Corp" not in pers_names

        # In Workspace A, User A does NOT see Personal A Solo
        get_a_again = await client.get(f"/api/v1/leads?workspace_id={ws_a_id}", headers=headers_a)
        assert "Personal A Solo" not in [item["company_name"] for item in get_a_again.json()["items"]]
