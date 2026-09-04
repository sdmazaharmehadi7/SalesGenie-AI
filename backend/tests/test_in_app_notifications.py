"""Tests for SalesGenie In-App Notifications & Activity Reminders."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import register_and_verify_user


@pytest.mark.asyncio
async def test_all_in_app_notifications_and_reminders() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        uid = uuid.uuid4().hex[:8]
        user_email = f"notif_user_{uid}@example.com"
        assignee_email = f"notif_assignee_{uid}@example.com"
        password = "SecurePassword123!"

        # Register User 1 (Manager)
        token1 = await register_and_verify_user(client, "Manager User", user_email, password, "sales_manager")
        headers1 = {"Authorization": f"Bearer {token1}"}

        # Register User 2 (Assignee)
        token2 = await register_and_verify_user(client, "Assignee User", assignee_email, password, "sales_rep")
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Get User 2 profile id
        me2_res = await client.get("/api/v1/auth/me", headers=headers2)
        assert me2_res.status_code == 200
        user2_id = me2_res.json()["id"]

        # Create Workspace
        ws_res = await client.post(
            "/api/v1/workspaces",
            headers=headers1,
            json={"name": "Notification Test Workspace", "slug": f"notif-ws-{uid}"},
        )
        assert ws_res.status_code == 201
        workspace_id = ws_res.json()["id"]

        # Add User 2 to workspace directly or create lead in workspace
        # -------------------------------------------------------------
        # 1. LEAD_ASSIGNED & LEAD_STATE_CHANGED
        # -------------------------------------------------------------
        lead_res = await client.post(
            "/api/v1/leads",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={
                "company_name": "Nexus Corp",
                "contact_name": "Nate Nexus",
                "email": "nate@nexus.com",
            },
        )
        assert lead_res.status_code == 201, lead_res.text
        lead_id = lead_res.json()["id"]

        # Change lead status -> triggers LEAD_STATE_CHANGED
        upd_lead_res = await client.patch(
            f"/api/v1/leads/{lead_id}",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={"lead_status": "qualified"},
        )
        assert upd_lead_res.status_code == 200, upd_lead_res.text

        # Check notifications for User 1
        notifs_res1 = await client.get("/api/v1/notifications", headers=headers1, params={"workspace_id": workspace_id})
        assert notifs_res1.status_code == 200
        notifs1 = notifs_res1.json()["items"]
        lead_changed_notif = next((n for n in notifs1 if n["type"] == "LEAD_STATE_CHANGED"), None)
        assert lead_changed_notif is not None, f"Expected LEAD_STATE_CHANGED, got {[n['type'] for n in notifs1]}"
        assert "Nexus Corp" in lead_changed_notif["title"]

        # -------------------------------------------------------------
        # 2. DEAL_STATE_CHANGED
        # -------------------------------------------------------------
        opp_res = await client.post(
            "/api/v1/opportunities",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={
                "name": "Enterprise Deal Alpha",
                "amount": 50000.0,
                "stage": "qualified",
                "lead_id": lead_id,
            },
        )
        assert opp_res.status_code == 201, opp_res.text
        opp_id = opp_res.json()["id"]

        # Move stage to proposal -> triggers DEAL_STATE_CHANGED
        upd_opp_res = await client.patch(
            f"/api/v1/opportunities/{opp_id}",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={"stage": "proposal"},
        )
        assert upd_opp_res.status_code == 200, upd_opp_res.text

        notifs_res1 = await client.get("/api/v1/notifications", headers=headers1, params={"workspace_id": workspace_id})
        notifs1 = notifs_res1.json()["items"]
        deal_changed_notif = next((n for n in notifs1 if n["type"] == "DEAL_STATE_CHANGED"), None)
        assert deal_changed_notif is not None, f"Expected DEAL_STATE_CHANGED, got {[n['type'] for n in notifs1]}"
        assert "Enterprise Deal Alpha" in deal_changed_notif["title"]

        # -------------------------------------------------------------
        # 3. TASK_RESCHEDULED
        # -------------------------------------------------------------
        task_due = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        task_res = await client.post(
            "/api/v1/tasks",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={
                "title": "Initial Demo Review",
                "due_date": task_due,
                "lead_id": lead_id,
            },
        )
        assert task_res.status_code == 201, task_res.text
        task_id = task_res.json()["id"]

        # Reschedule task to new date -> triggers TASK_RESCHEDULED
        new_due = (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()
        upd_task_res = await client.patch(
            f"/api/v1/tasks/{task_id}",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={"due_date": new_due},
        )
        assert upd_task_res.status_code == 200, upd_task_res.text

        notifs_res1 = await client.get("/api/v1/notifications", headers=headers1, params={"workspace_id": workspace_id})
        notifs1 = notifs_res1.json()["items"]
        task_resched_notif = next((n for n in notifs1 if n["type"] == "TASK_RESCHEDULED"), None)
        assert task_resched_notif is not None, f"Expected TASK_RESCHEDULED, got {[n['type'] for n in notifs1]}"

        # -------------------------------------------------------------
        # 4. MEETING_SCHEDULED & Activity Log Entry
        # -------------------------------------------------------------
        meeting_time = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        act_res = await client.post(
            "/api/v1/activities",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={
                "interaction_type": "meeting",
                "lead_id": lead_id,
                "summary": "Meeting scheduled: Product Architecture Review",
                "interaction_date": meeting_time,
            },
        )
        assert act_res.status_code == 201, act_res.text
        act_data = act_res.json()
        assert act_data["interaction_type"] == "meeting"

        # Verify activity timeline log entry exists
        timeline_res = await client.get(
            "/api/v1/activities",
            headers=headers1,
            params={"workspace_id": workspace_id, "lead_id": lead_id},
        )
        assert timeline_res.status_code == 200
        assert any(a["interaction_type"] == "meeting" for a in timeline_res.json())

        # Verify MEETING_SCHEDULED notification exists
        notifs_res1 = await client.get("/api/v1/notifications", headers=headers1, params={"workspace_id": workspace_id})
        notifs1 = notifs_res1.json()["items"]
        meeting_sched_notif = next((n for n in notifs1 if n["type"] == "MEETING_SCHEDULED"), None)
        assert meeting_sched_notif is not None, f"Expected MEETING_SCHEDULED, got {[n['type'] for n in notifs1]}"

        # -------------------------------------------------------------
        # 5. SCHEDULER: TASK_OVERDUE, FOLLOWUP_APPROACHING, FOLLOWUP_OVERDUE, MEETING_REMINDER
        # -------------------------------------------------------------
        # Create an overdue task
        overdue_task_due = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        await client.post(
            "/api/v1/tasks",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={
                "title": "Send Contract Redlines",
                "due_date": overdue_task_due,
                "lead_id": lead_id,
            },
        )

        # Create a follow-up approaching in 10 minutes (<= 15 min window)
        approaching_fu_due = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        await client.post(
            "/api/v1/follow-ups",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={
                "title": "Call Nate about terms",
                "due_date": approaching_fu_due,
                "lead_id": lead_id,
            },
        )

        # Create an overdue follow-up
        overdue_fu_due = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
        await client.post(
            "/api/v1/follow-ups",
            headers=headers1,
            params={"workspace_id": workspace_id},
            json={
                "title": "Overdue check-in with Nate",
                "due_date": overdue_fu_due,
                "lead_id": lead_id,
            },
        )

        # Trigger scheduler tick
        sched_res = await client.post("/api/v1/notifications/run-scheduler", headers=headers1)
        assert sched_res.status_code == 200, sched_res.text
        counts = sched_res.json()["counts"]
        assert counts["task_overdue"] >= 1
        assert counts["followup_approaching"] >= 1
        assert counts["followup_overdue"] >= 1
        assert counts["meeting_reminder"] >= 1  # From the meeting created in step 4

        # Verify notifications in User 1's list
        notifs_res1 = await client.get("/api/v1/notifications", headers=headers1, params={"workspace_id": workspace_id})
        notifs1 = notifs_res1.json()["items"]
        types = {n["type"] for n in notifs1}

        assert "TASK_OVERDUE" in types
        assert "FOLLOWUP_APPROACHING" in types
        assert "FOLLOWUP_OVERDUE" in types
        assert "MEETING_REMINDER" in types

        # -------------------------------------------------------------
        # 6. IDEMPOTENCY / DUPLICATE PREVENTION TEST
        # Re-running scheduler must NOT create duplicate notifications
        # -------------------------------------------------------------
        total_before = len(notifs1)
        sched_res2 = await client.post("/api/v1/notifications/run-scheduler", headers=headers1)
        assert sched_res2.status_code == 200
        counts2 = sched_res2.json()["counts"]
        assert counts2["task_overdue"] == 0
        assert counts2["followup_approaching"] == 0
        assert counts2["followup_overdue"] == 0
        assert counts2["meeting_reminder"] == 0

        notifs_res2 = await client.get("/api/v1/notifications", headers=headers1, params={"workspace_id": workspace_id})
        total_after = len(notifs_res2.json()["items"])
        assert total_after == total_before, f"Expected {total_before} notifications, got {total_after}"

        # -------------------------------------------------------------
        # 7. MARK AS READ & UNREAD COUNT
        # -------------------------------------------------------------
        unread_res = await client.get("/api/v1/notifications/unread-count", headers=headers1, params={"workspace_id": workspace_id})
        assert unread_res.status_code == 200
        initial_unread = unread_res.json()["unread_count"]
        assert initial_unread > 0

        # Mark single notification read
        first_notif = notifs1[0]
        read_res = await client.patch(f"/api/v1/notifications/{first_notif['id']}/read", headers=headers1)
        assert read_res.status_code == 200
        assert read_res.json()["is_read"] is True

        unread_res2 = await client.get("/api/v1/notifications/unread-count", headers=headers1, params={"workspace_id": workspace_id})
        assert unread_res2.json()["unread_count"] == initial_unread - 1

        # Mark all as read
        all_read_res = await client.post("/api/v1/notifications/mark-all-read", headers=headers1, params={"workspace_id": workspace_id})
        assert all_read_res.status_code == 200

        unread_res3 = await client.get("/api/v1/notifications/unread-count", headers=headers1, params={"workspace_id": workspace_id})
        assert unread_res3.json()["unread_count"] == 0
