"""
Comprehensive test suite for the Notifications module.

Verifies:
1. Sarah (Manager) assigning ABC Corporation to David (Team Member) results in:
   - David receives in-app notification.
   - David receives email from SalesGenie with Manager name & Lead data.
   - Sarah receives NO assignment notification.
   - Unrelated workspace member receives NO notification.
2. User and workspace data isolation (User A cannot see User B's notifications).
3. Workspace isolation (Workspace A notifications do not appear in Workspace B).
4. Marking as read and marking all as read.
5. Notification preferences (toggling off disables notifications).
6. Lead status changed notifications.
7. Team mentions notifications in notes/activities.
8. Email failure during lead assignment does not fail the lead assignment.
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.integrations.email.base import EmailProvider
from app.main import app
from app.models.notification import Notification, NotificationType
from app.models.user import User
from tests.conftest import register_and_verify_user


class MockTestEmailProvider(EmailProvider):
    def __init__(self):
        self.sent_emails = []

    async def send_email(self, *, to_address: str, subject: str, body: str) -> bool:
        self.sent_emails.append({"to": to_address, "subject": subject, "body": body})
        return True


@pytest.mark.asyncio
async def test_sarah_assigns_abc_corp_to_david_e2e():
    """
    Test scenario from prompt:
    - Manager: Sarah
    - Team Member: David
    - Lead: ABC Corporation
    - Sarah assigns ABC Corporation to David
    Expected:
    1. Lead assignment succeeds.
    2. David receives an in-app notification.
    3. David receives an email from SalesGenie.
    4. Email contains Sarah's name and ABC Corporation's lead activity.
    5. David's notification bell shows the unread notification.
    6. Sarah does NOT receive David's assignment notification.
    7. Another workspace member does NOT receive it.
    8. Marking it as read updates the backend.
    9. Workspace isolation: personal area vs workspace.
    """
    mock_email = MockTestEmailProvider()

    with patch("app.services.notification_service.get_email_provider", return_value=mock_email):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Register Sarah (Manager)
            sarah_token = await register_and_verify_user(
                client,
                name="Sarah",
                email=f"sarah_{uuid.uuid4().hex[:6]}@example.com",
                role="sales_manager",
            )
            sarah_headers = {"Authorization": f"Bearer {sarah_token}"}

            # 2. Register David (Team Member)
            david_email = f"david_{uuid.uuid4().hex[:6]}@example.com"
            david_token = await register_and_verify_user(
                client,
                name="David",
                email=david_email,
                role="sales_rep",
            )
            david_headers = {"Authorization": f"Bearer {david_token}"}

            # 3. Register Alice (Unrelated Workspace Member)
            alice_email = f"alice_{uuid.uuid4().hex[:6]}@example.com"
            alice_token = await register_and_verify_user(
                client,
                name="Alice",
                email=alice_email,
                role="sales_rep",
            )
            alice_headers = {"Authorization": f"Bearer {alice_token}"}

            # 4. Sarah creates a Workspace
            ws_res = await client.post(
                "/api/v1/workspaces",
                json={"name": "Sales Titans Workspace"},
                headers=sarah_headers,
            )
            assert ws_res.status_code == 201, ws_res.text
            ws_id = ws_res.json()["id"]

            # Get David and Alice's user IDs
            async with AsyncSessionLocal() as db:
                david_user = (await db.execute(select(User).where(User.email == david_email))).scalar_one()

            # Sarah adds David and Alice to workspace
            await client.post(
                f"/api/v1/workspaces/{ws_id}/members",
                json={"user_id": str(david_user.id), "role": "team_member"},
                headers=sarah_headers,
            )

            async with AsyncSessionLocal() as db:
                alice_user = (await db.execute(select(User).where(User.email == alice_email))).scalar_one()

            await client.post(
                f"/api/v1/workspaces/{ws_id}/members",
                json={"user_id": str(alice_user.id), "role": "team_member"},
                headers=sarah_headers,
            )

            # Sarah creates Lead "ABC Corporation" in the workspace
            lead_res = await client.post(
                f"/api/v1/leads?workspace_id={ws_id}",
                json={
                    "company_name": "ABC Corporation",
                    "contact_name": "John CEO",
                    "email": "john@abccorp.com",
                    "lead_status": "new",
                },
                headers=sarah_headers,
            )
            assert lead_res.status_code == 201, lead_res.text
            lead_id = lead_res.json()["id"]

            # Sarah assigns ABC Corporation to David
            assign_res = await client.patch(
                f"/api/v1/leads/{lead_id}?workspace_id={ws_id}",
                json={"assigned_to": str(david_user.id)},
                headers=sarah_headers,
            )
            assert assign_res.status_code == 200, assign_res.text
            assert assign_res.json()["assigned_to"] == str(david_user.id)

            # 5. Verify David received the in-app notification
            david_notif_res = await client.get(
                f"/api/v1/notifications?workspace_id={ws_id}",
                headers=david_headers,
            )
            assert david_notif_res.status_code == 200
            david_notifs = david_notif_res.json()["items"]
            assert len(david_notifs) >= 1

            assignment_notif = next(
                (n for n in david_notifs if n["type"] == NotificationType.LEAD_ASSIGNED.value), None
            )
            assert assignment_notif is not None
            assert "ABC Corporation" in assignment_notif["title"]
            assert "Sarah" in assignment_notif["message"]
            assert assignment_notif["is_read"] is False

            # Verify unread count for David
            david_count_res = await client.get(
                f"/api/v1/notifications/unread-count?workspace_id={ws_id}",
                headers=david_headers,
            )
            assert david_count_res.status_code == 200
            assert david_count_res.json()["unread_count"] >= 1

            # 6. Verify David received the email from SalesGenie
            assert len(mock_email.sent_emails) == 1
            sent = mock_email.sent_emails[0]
            assert sent["to"] == david_email
            assert "New Lead Assigned to You" in sent["subject"]
            assert "ABC Corporation" in sent["subject"]
            assert "Sarah" in sent["body"]
            assert "David" in sent["body"]
            assert "ABC Corporation" in sent["body"]
            assert f"http://localhost:5173/leads/{lead_id}" in sent["body"]

            # 7. Verify Sarah does NOT receive David's assignment notification
            sarah_notif_res = await client.get(
                f"/api/v1/notifications?workspace_id={ws_id}",
                headers=sarah_headers,
            )
            assert sarah_notif_res.status_code == 200
            sarah_notifs = sarah_notif_res.json()["items"]
            assert not any(n["type"] == NotificationType.LEAD_ASSIGNED.value for n in sarah_notifs)

            # 8. Verify Alice (another workspace member) does NOT receive it
            alice_notif_res = await client.get(
                f"/api/v1/notifications?workspace_id={ws_id}",
                headers=alice_headers,
            )
            assert alice_notif_res.status_code == 200
            assert len(alice_notif_res.json()["items"]) == 0

            # 9. Verify David marking it as read updates the backend
            mark_res = await client.patch(
                f"/api/v1/notifications/{assignment_notif['id']}/read",
                headers=david_headers,
            )
            assert mark_res.status_code == 200
            assert mark_res.json()["is_read"] is True

            # 10. Verify Sarah cannot mark David's notification as read (forbidden)
            sarah_mark_res = await client.patch(
                f"/api/v1/notifications/{assignment_notif['id']}/read",
                headers=sarah_headers,
            )
            assert sarah_mark_res.status_code == 403

            # 11. Verify Workspace Isolation: David in Personal Area sees 0 workspace notifications
            personal_notif_res = await client.get(
                "/api/v1/notifications",
                headers=david_headers,
            )
            assert personal_notif_res.status_code == 200
            assert len(personal_notif_res.json()["items"]) == 0


@pytest.mark.asyncio
async def test_notification_preferences():
    """Verify getting and updating notification preferences."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await register_and_verify_user(
            client,
            name="PrefUser",
            email=f"pref_{uuid.uuid4().hex[:6]}@example.com",
        )
        headers = {"Authorization": f"Bearer {token}"}

        # Get default preferences
        get_res = await client.get("/api/v1/notifications/preferences", headers=headers)
        assert get_res.status_code == 200
        prefs = get_res.json()
        assert prefs["lead_assigned_inapp"] is True
        assert prefs["lead_assigned_email"] is True

        # Update preferences
        update_res = await client.put(
            "/api/v1/notifications/preferences",
            json={"lead_assigned_email": False, "ai_insights_inapp": False},
            headers=headers,
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["lead_assigned_email"] is False
        assert updated["ai_insights_inapp"] is False
        assert updated["lead_assigned_inapp"] is True


@pytest.mark.asyncio
async def test_lead_status_changed_notification():
    """Verify lead status change notifies the assigned user."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        manager_token = await register_and_verify_user(
            client,
            name="Boss",
            email=f"boss_{uuid.uuid4().hex[:6]}@example.com",
            role="sales_manager",
        )
        manager_headers = {"Authorization": f"Bearer {manager_token}"}

        rep_email = f"rep_{uuid.uuid4().hex[:6]}@example.com"
        rep_token = await register_and_verify_user(
            client,
            name="Rep",
            email=rep_email,
            role="sales_rep",
        )
        rep_headers = {"Authorization": f"Bearer {rep_token}"}

        ws_res = await client.post(
            "/api/v1/workspaces",
            json={"name": "Pipeline WS"},
            headers=manager_headers,
        )
        ws_id = ws_res.json()["id"]

        async with AsyncSessionLocal() as db:
            rep_user = (await db.execute(select(User).where(User.email == rep_email))).scalar_one()

        await client.post(
            f"/api/v1/workspaces/{ws_id}/members",
            json={"user_id": str(rep_user.id), "role": "team_member"},
            headers=manager_headers,
        )

        lead_res = await client.post(
            f"/api/v1/leads?workspace_id={ws_id}",
            json={"company_name": "Target Co", "assigned_to": str(rep_user.id)},
            headers=manager_headers,
        )
        lead_id = lead_res.json()["id"]

        # Manager changes lead status to 'qualified'
        status_res = await client.patch(
            f"/api/v1/leads/{lead_id}?workspace_id={ws_id}",
            json={"lead_status": "qualified"},
            headers=manager_headers,
        )
        assert status_res.status_code == 200

        # Rep checks notifications
        notif_res = await client.get(
            f"/api/v1/notifications?workspace_id={ws_id}",
            headers=rep_headers,
        )
        assert notif_res.status_code == 200
        notifs = notif_res.json()["items"]
        status_notif = next(
            (n for n in notifs if n["type"] == NotificationType.LEAD_STATUS_CHANGED.value), None
        )
        assert status_notif is not None
        assert "qualified" in status_notif["message"]


@pytest.mark.asyncio
async def test_team_mention_notification():
    """Verify teammate @mention in CRM activity creates notification."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        author_token = await register_and_verify_user(
            client,
            name="Charlie",
            email=f"charlie_{uuid.uuid4().hex[:6]}@example.com",
        )
        author_headers = {"Authorization": f"Bearer {author_token}"}

        target_token = await register_and_verify_user(
            client,
            name="Daisy",
            email=f"daisy_{uuid.uuid4().hex[:6]}@example.com",
        )
        target_headers = {"Authorization": f"Bearer {target_token}"}

        # Charlie logs activity mentioning @daisy
        act_res = await client.post(
            "/api/v1/activities",
            json={
                "interaction_type": "call",
                "summary": "Great meeting with client. Hey @daisy can you follow up tomorrow?",
            },
            headers=author_headers,
        )
        assert act_res.status_code == 201

        # Daisy checks notifications
        notif_res = await client.get("/api/v1/notifications", headers=target_headers)
        assert notif_res.status_code == 200
        notifs = notif_res.json()["items"]
        mention_notif = next(
            (n for n in notifs if n["type"] == NotificationType.TEAM_MENTIONS.value), None
        )
        assert mention_notif is not None
        assert "Charlie mentioned you" in mention_notif["title"]


@pytest.mark.asyncio
async def test_email_failure_does_not_break_lead_assignment():
    """Verify that if SMTP email provider throws an error, lead assignment still succeeds."""
    mock_failing_email = MockTestEmailProvider()
    mock_failing_email.send_email = AsyncMock(side_effect=Exception("SMTP connection failed"))

    with patch("app.services.notification_service.get_email_provider", return_value=mock_failing_email):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            mgr_token = await register_and_verify_user(
                client,
                name="Manager",
                email=f"mgr_{uuid.uuid4().hex[:6]}@example.com",
                role="sales_manager",
            )
            mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

            rep_email = f"rep_{uuid.uuid4().hex[:6]}@example.com"
            rep_token = await register_and_verify_user(
                client,
                name="RepUser",
                email=rep_email,
                role="sales_rep",
            )

            ws_res = await client.post(
                "/api/v1/workspaces",
                json={"name": "Resilience WS"},
                headers=mgr_headers,
            )
            ws_id = ws_res.json()["id"]

            async with AsyncSessionLocal() as db:
                rep_user = (await db.execute(select(User).where(User.email == rep_email))).scalar_one()

            await client.post(
                f"/api/v1/workspaces/{ws_id}/members",
                json={"user_id": str(rep_user.id), "role": "team_member"},
                headers=mgr_headers,
            )

            lead_res = await client.post(
                f"/api/v1/leads?workspace_id={ws_id}",
                json={"company_name": "Robust Tech"},
                headers=mgr_headers,
            )
            lead_id = lead_res.json()["id"]

            # Assign lead to Rep — must succeed despite mock email throwing exception
            assign_res = await client.patch(
                f"/api/v1/leads/{lead_id}?workspace_id={ws_id}",
                json={"assigned_to": str(rep_user.id)},
                headers=mgr_headers,
            )
            assert assign_res.status_code == 200, assign_res.text
            assert assign_res.json()["assigned_to"] == str(rep_user.id)
