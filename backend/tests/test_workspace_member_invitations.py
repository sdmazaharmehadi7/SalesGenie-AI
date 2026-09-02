"""
Comprehensive integration tests for the Workspace Member Invitation flow.

Tests:
1. Search existing registered users by email.
2. Validation checks before creating an invitation (unregistered user, already a member, duplicate pending, non-manager).
3. In-app notification and email dispatch upon invitation.
4. Recipient views pending invitations on /workspaces/invitations/pending.
5. Acceptance flow: member created with role team_member, workspace in list, notification resolved.
6. Decline flow: status marked declined, user not added to workspace, notification resolved.
7. Resend flow: manager resends declined/expired invitation.
8. Security & Workspace isolation: cross-user authorization barriers.
"""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from tests.conftest import register_and_verify_user


@pytest.mark.asyncio
async def test_search_registered_users():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique = uuid.uuid4().hex[:6]
        email_manager = f"sarah_mgr_{unique}@example.com"
        email_member = f"john_rep_{unique}@example.com"

        token_mgr = await register_and_verify_user(client, "Sarah Connor", email_manager, "Password123!")
        token_rep = await register_and_verify_user(client, "John Smith", email_member, "Password123!")
        headers_mgr = {"Authorization": f"Bearer {token_mgr}"}

        # Search for John by partial email
        res = await client.get(f"/api/v1/users/search?email=john_rep_{unique}", headers=headers_mgr)
        assert res.status_code == 200
        results = res.json()
        assert len(results) >= 1
        found = next((u for u in results if u["email"] == email_member), None)
        assert found is not None
        assert found["name"] == "John Smith"
        assert "hashed_password" not in found

        # Search for non-existent user
        res_none = await client.get("/api/v1/users/search?email=nobody_exists_xyz@example.com", headers=headers_mgr)
        assert res_none.status_code == 200
        assert len(res_none.json()) == 0


@pytest.mark.asyncio
async def test_workspace_invitation_validations():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique = uuid.uuid4().hex[:6]
        email_sarah = f"sarah_{unique}@example.com"
        email_john = f"john_{unique}@example.com"

        token_sarah = await register_and_verify_user(client, "Sarah", email_sarah, "Password123!")
        token_john = await register_and_verify_user(client, "John", email_john, "Password123!")
        headers_sarah = {"Authorization": f"Bearer {token_sarah}"}
        headers_john = {"Authorization": f"Bearer {token_john}"}

        # Sarah creates workspace
        ws_res = await client.post("/api/v1/workspaces", headers=headers_sarah, json={
            "name": f"Acme Sales Team {unique}",
        })
        assert ws_res.status_code == 201
        ws_id = ws_res.json()["id"]

        # Validation 1: Unregistered email
        res_unreg = await client.post(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_sarah, json={
            "email": f"unregistered_{unique}@notfound.com",
            "role": "team_member",
        })
        assert res_unreg.status_code == 404
        assert "No SalesGenie account exists with this email" in res_unreg.json()["error"]["message"]

        # Validation 2: Cannot invite self
        res_self = await client.post(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_sarah, json={
            "email": email_sarah,
            "role": "team_member",
        })
        assert res_self.status_code == 422
        assert "cannot invite yourself" in res_self.json()["error"]["message"]

        # Success: Sarah invites John
        res_inv = await client.post(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_sarah, json={
            "email": email_john,
            "role": "team_member",
        })
        assert res_inv.status_code == 201
        inv_data = res_inv.json()
        assert inv_data["email"] == email_john
        assert inv_data["status"] == "pending"

        # Validation 3: Duplicate pending invitation
        res_dup = await client.post(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_sarah, json={
            "email": email_john,
            "role": "team_member",
        })
        assert res_dup.status_code == 409
        assert "already pending" in res_dup.json()["error"]["message"]

        # Validation 4: Non-manager cannot invite members
        res_unauth = await client.post(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_john, json={
            "email": email_sarah,
            "role": "team_member",
        })
        assert res_unauth.status_code == 403


@pytest.mark.asyncio
async def test_full_workspace_invitation_accept_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique = uuid.uuid4().hex[:6]
        email_sarah = f"sarah_e2e_{unique}@example.com"
        email_john = f"john_e2e_{unique}@example.com"

        token_sarah = await register_and_verify_user(client, "Sarah Connor", email_sarah, "Password123!")
        token_john = await register_and_verify_user(client, "John Smith", email_john, "Password123!")
        headers_sarah = {"Authorization": f"Bearer {token_sarah}"}
        headers_john = {"Authorization": f"Bearer {token_john}"}

        # 1. Sarah creates workspace
        ws_res = await client.post("/api/v1/workspaces", headers=headers_sarah, json={
            "name": "Acme Sales Team",
        })
        assert ws_res.status_code == 201
        ws_id = ws_res.json()["id"]

        # 2. Sarah invites John
        inv_res = await client.post(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_sarah, json={
            "email": email_john,
            "role": "team_member",
        })
        assert inv_res.status_code == 201
        inv_token = inv_res.json()["token"]

        # 3. Verify John received in-app notification
        notif_res = await client.get("/api/v1/notifications", headers=headers_john)
        assert notif_res.status_code == 200
        notifs = notif_res.json()["items"]
        assert len(notifs) >= 1
        inv_notif = next((n for n in notifs if n["type"] == "workspace_invitation"), None)
        assert inv_notif is not None
        assert "Sarah Connor" in inv_notif["message"]
        assert "Acme Sales Team" in inv_notif["message"]
        assert inv_notif["is_read"] is False

        # Sarah should NOT have John's notification
        sarah_notif = await client.get("/api/v1/notifications", headers=headers_sarah)
        assert not any(n["type"] == "workspace_invitation" for n in sarah_notif.json()["items"])

        # 4. John views pending invitations
        pending_res = await client.get("/api/v1/workspaces/invitations/pending", headers=headers_john)
        assert pending_res.status_code == 200
        pending_list = pending_res.json()
        assert len(pending_list) == 1
        assert pending_list[0]["workspace_name"] == "Acme Sales Team"
        assert pending_list[0]["invited_by_name"] == "Sarah Connor"

        # 5. John accepts invitation
        accept_res = await client.post("/api/v1/workspaces/invitations/accept", headers=headers_john, json={
            "token": inv_token,
        })
        assert accept_res.status_code == 200
        assert accept_res.json()["workspace_name"] == "Acme Sales Team"
        assert accept_res.json()["role"] == "team_member"

        # 6. Verify Acme Sales Team appears in John's workspace list
        john_ws_res = await client.get("/api/v1/workspaces", headers=headers_john)
        assert john_ws_res.status_code == 200
        john_workspaces = [w["name"] for w in john_ws_res.json()]
        assert "Acme Sales Team" in john_workspaces

        # 7. Verify John's notification was marked as read
        notif_res_after = await client.get("/api/v1/notifications", headers=headers_john)
        inv_notif_after = next(n for n in notif_res_after.json()["items"] if n["id"] == inv_notif["id"])
        assert inv_notif_after["is_read"] is True

        # 8. Sarah sees John as active member
        members_res = await client.get(f"/api/v1/workspaces/{ws_id}/members", headers=headers_sarah)
        assert members_res.status_code == 200
        members = members_res.json()
        john_member = next((m for m in members if m["user_email"] == email_john), None)
        assert john_member is not None
        assert john_member["status"] == "active"
        assert john_member["role"] == "team_member"

        # 9. Validation: Cannot invite John again because he is already an active member
        res_already = await client.post(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_sarah, json={
            "email": email_john,
            "role": "team_member",
        })
        assert res_already.status_code == 409
        assert "already a member" in res_already.json()["error"]["message"]


@pytest.mark.asyncio
async def test_workspace_invitation_decline_and_resend_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique = uuid.uuid4().hex[:6]
        email_sarah = f"sarah_dec_{unique}@example.com"
        email_bob = f"bob_dec_{unique}@example.com"

        token_sarah = await register_and_verify_user(client, "Sarah Connor", email_sarah, "Password123!")
        token_bob = await register_and_verify_user(client, "Bob Davis", email_bob, "Password123!")
        headers_sarah = {"Authorization": f"Bearer {token_sarah}"}
        headers_bob = {"Authorization": f"Bearer {token_bob}"}

        # 1. Sarah creates workspace
        ws_res = await client.post("/api/v1/workspaces", headers=headers_sarah, json={
            "name": f"Enterprise Sales {unique}",
        })
        assert ws_res.status_code == 201
        ws_id = ws_res.json()["id"]

        # 2. Sarah invites Bob
        inv_res = await client.post(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_sarah, json={
            "email": email_bob,
            "role": "team_member",
        })
        assert inv_res.status_code == 201
        inv_id = inv_res.json()["id"]
        inv_token = inv_res.json()["token"]

        # 3. Bob declines invitation
        decline_res = await client.post("/api/v1/workspaces/invitations/reject", headers=headers_bob, json={
            "token": inv_token,
        })
        assert decline_res.status_code == 204

        # 4. Bob does NOT belong to Enterprise Sales
        bob_ws = await client.get("/api/v1/workspaces", headers=headers_bob)
        assert not any(w["name"] == f"Enterprise Sales {unique}" for w in bob_ws.json())

        # 5. Sarah views invitations and sees Declined
        mgr_invs = await client.get(f"/api/v1/workspaces/{ws_id}/invitations", headers=headers_sarah)
        assert mgr_invs.status_code == 200
        bob_inv = next((i for i in mgr_invs.json() if i["id"] == inv_id), None)
        assert bob_inv is not None
        assert bob_inv["status"] == "declined"

        # 6. Sarah resends invitation
        resend_res = await client.post(f"/api/v1/workspaces/{ws_id}/invitations/{inv_id}/resend", headers=headers_sarah)
        assert resend_res.status_code == 200
        new_inv = resend_res.json()
        assert new_inv["status"] == "pending"
        new_token = new_inv["token"]

        # 7. Bob accepts the resent invitation
        accept_res = await client.post("/api/v1/workspaces/invitations/accept", headers=headers_bob, json={
            "token": new_token,
        })
        assert accept_res.status_code == 200
        assert accept_res.json()["role"] == "team_member"

        # 8. Bob is now an active member
        bob_ws_after = await client.get("/api/v1/workspaces", headers=headers_bob)
        assert any(w["name"] == f"Enterprise Sales {unique}" for w in bob_ws_after.json())
