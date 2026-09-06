"""
Unit and Integration tests for Gmail email retrieval and filtering logic.

Verifies:
1. SalesGenie OTP / verification emails are rejected.
2. SalesGenie workspace invitation emails are rejected.
3. System / auth / noreply / self-sent emails are rejected.
4. Unrelated messages not part of SalesGenie outreach are rejected.
5. Sending an outreach email stores Gmail message_id, thread_id, lead_id, contact_id in
   SalesInteraction and EmailIntegration.metadata_json["outreach_threads"].
6. Incoming replies belonging to an outreach thread are accepted and logged.
7. Deduplication: already logged messages are skipped and notifications use idempotent keys.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.integrations.email.gmail_client import GmailClient
from app.models.email_integration import EmailIntegration, EmailProviderType, IntegrationStatus
from app.models.lead import Lead
from app.models.sales_interaction import SalesInteraction
from app.models.user import User
from app.schemas.email_integration import GmailSendRequest
from app.services.gmail_integration_service import GmailIntegrationService, _encrypt_token


def test_is_system_or_auth_email_filter():
    """Verify that system, auth, OTP, and invitation emails are correctly identified."""
    service = GmailIntegrationService

    # 1. OTP / Verification emails
    otp_email_1 = {
        "from_address": "support@salesgenie.ai",
        "clean_from": "support@salesgenie.ai",
        "subject": "Your SalesGenie verification code is 123456",
        "snippet": "Use 123456 to verify your account",
    }
    assert service.is_system_or_auth_email(otp_email_1) is True

    otp_email_2 = {
        "from_address": "auth@company.com",
        "clean_from": "auth@company.com",
        "subject": "Your one-time password (OTP)",
        "snippet": "Here is your OTP code",
    }
    assert service.is_system_or_auth_email(otp_email_2) is True

    # 2. Workspace invitation emails
    invite_email = {
        "from_address": "team@salesgenie.ai",
        "clean_from": "team@salesgenie.ai",
        "subject": "Sayyad invited you to join Acme Corp on SalesGenie",
        "snippet": "You have been invited to collaborate...",
    }
    assert service.is_system_or_auth_email(invite_email) is True

    # 3. System / Noreply / Auth Provider senders
    noreply_email = {
        "from_address": "noreply@external.com",
        "clean_from": "noreply@external.com",
        "subject": "Account update",
        "snippet": "Your profile was updated.",
    }
    assert service.is_system_or_auth_email(noreply_email) is True

    google_alert = {
        "from_address": "no-reply@accounts.google.com",
        "clean_from": "no-reply@accounts.google.com",
        "subject": "Security alert for linked account",
        "snippet": "New sign-in from Mac",
    }
    assert service.is_system_or_auth_email(google_alert) is True

    # 4. Self-sent email
    self_sent = {
        "from_address": "rep@salesgenie.ai",
        "clean_from": "rep@salesgenie.ai",
        "subject": "Just following up",
        "snippet": "Hi lead, following up...",
    }
    assert service.is_system_or_auth_email(self_sent, user_email="rep@salesgenie.ai") is True

    # 5. Legitimate prospect reply (MUST NOT be rejected)
    lead_reply = {
        "from_address": "john.doe@prospect.com",
        "clean_from": "john.doe@prospect.com",
        "subject": "Re: SalesGenie Demo and Pricing",
        "snippet": "Hi, thanks for reaching out! We would love a demo this Thursday.",
    }
    assert service.is_system_or_auth_email(lead_reply, user_email="rep@salesgenie.ai") is False


@pytest.mark.asyncio
async def test_send_email_stores_outreach_thread_and_ids():
    """
    Verify that send_email stores gmail_message_id, gmail_thread_id, lead_id, contact_id
    both in SalesInteraction.action_items and in EmailIntegration.metadata_json["outreach_threads"].
    """
    mock_db = AsyncMock()
    mock_client = MagicMock(spec=GmailClient)
    mock_client.send_email = AsyncMock(return_value={
        "id": "gmail_msg_100",
        "threadId": "gmail_th_200",
    })

    current_user = User(id=uuid.uuid4(), email="rep@mycompany.com", name="Sales Rep")
    lead_id = uuid.uuid4()
    mock_lead = Lead(id=lead_id, email="lead@target.com", workspace_id=uuid.uuid4())

    mock_integration = EmailIntegration(
        id=uuid.uuid4(),
        user_id=current_user.id,
        provider=EmailProviderType.GMAIL,
        provider_email="rep@mycompany.com",
        access_token_encrypted=_encrypt_token("mock_access_token"),
        refresh_token_encrypted=_encrypt_token("mock_refresh_token"),
        token_expiry=datetime.now(timezone.utc),
        status=IntegrationStatus.CONNECTED,
        metadata_json={},
    )

    svc = GmailIntegrationService(mock_db, gmail_client=mock_client)
    svc.get_integration = AsyncMock(return_value=mock_integration)
    svc.get_valid_access_token = AsyncMock(return_value="mock_access_token")

    # Mock DB query for Lead
    mock_lead_result = MagicMock()
    mock_lead_result.scalar_one_or_none.return_value = mock_lead
    mock_db.execute = AsyncMock(return_value=mock_lead_result)

    payload = GmailSendRequest(
        to_email="lead@target.com",
        subject="Excited to connect",
        body="Hi Lead, would you be open for a quick demo?",
        lead_id=lead_id,
        track_opens=False,
    )

    response = await svc.send_email(current_user=current_user, payload=payload)

    assert response.success is True
    assert response.message_id == "gmail_msg_100"
    assert response.thread_id == "gmail_th_200"

    # Verify EmailIntegration metadata_json updated with outreach_threads
    outreach_threads = mock_integration.metadata_json.get("outreach_threads", {})
    assert "gmail_th_200" in outreach_threads
    thread_data = outreach_threads["gmail_th_200"]
    assert thread_data["lead_id"] == str(lead_id)
    assert thread_data["initial_message_id"] == "gmail_msg_100"
    assert thread_data["lead_email"] == "lead@target.com"
    assert thread_data["subject"] == "Excited to connect"

    # Verify SalesInteraction added to DB
    assert mock_db.add.called
    added_interaction = mock_db.add.call_args[0][0]
    assert isinstance(added_interaction, SalesInteraction)
    assert added_interaction.lead_id == lead_id
    action_items = added_interaction.action_items
    assert len(action_items) == 1
    assert action_items[0]["type"] == "gmail_email_sent"
    assert action_items[0]["gmail_message_id"] == "gmail_msg_100"
    assert action_items[0]["gmail_thread_id"] == "gmail_th_200"
    assert action_items[0]["lead_id"] == str(lead_id)


@pytest.mark.asyncio
async def test_sync_filters_otp_and_unrelated_and_matches_outreach_reply():
    """
    Verify that sync_relevant_emails:
    - Rejects OTP / verification emails even if sent to/from a lead email
    - Rejects unrelated messages not in outreach thread
    - Accepts legitimate replies to SalesGenie outreach threads
    - Prevents duplicates on subsequent syncs
    """
    mock_db = AsyncMock()
    mock_client = MagicMock(spec=GmailClient)

    current_user = User(id=uuid.uuid4(), email="rep@mycompany.com", name="Sales Rep")
    lead_id = uuid.uuid4()
    mock_lead = Lead(id=lead_id, email="lead@target.com", contact_name="John Prospect", company_name="Target Corp")

    # Set up integration with a known outreach thread
    mock_integration = EmailIntegration(
        id=uuid.uuid4(),
        user_id=current_user.id,
        provider=EmailProviderType.GMAIL,
        provider_email="rep@mycompany.com",
        access_token_encrypted=_encrypt_token("mock_access_token"),
        refresh_token_encrypted=_encrypt_token("mock_refresh_token"),
        status=IntegrationStatus.CONNECTED,
        metadata_json={
            "outreach_threads": {
                "outreach_thread_123": {
                    "lead_id": str(lead_id),
                    "lead_email": "lead@target.com",
                    "initial_message_id": "outreach_msg_001",
                    "subject": "SalesGenie Product Demo",
                }
            }
        },
    )

    svc = GmailIntegrationService(mock_db, gmail_client=mock_client)
    svc.get_integration = AsyncMock(return_value=mock_integration)
    svc.get_valid_access_token = AsyncMock(return_value="mock_access_token")

    # Mock DB queries:
    # 1. Leads query -> returns mock_lead
    # 2. Contacts query -> returns empty
    # 3. Existing SalesInteraction query -> returns empty (no previous interactions)
    mock_lead_res = MagicMock()
    mock_lead_res.scalars.return_value.all.return_value = [mock_lead]

    mock_contact_res = MagicMock()
    mock_contact_res.scalars.return_value.all.return_value = []

    mock_si_res = MagicMock()
    mock_si_res.scalars.return_value.all.return_value = []

    mock_db.execute = AsyncMock(side_effect=[mock_lead_res, mock_contact_res, mock_si_res])

    # Mock Gmail query_messages returning 3 messages:
    # msg_otp: An OTP email
    # msg_unrelated: An unrelated message from a different sender
    # msg_reply: A legitimate reply in the outreach thread
    mock_client.query_messages = AsyncMock(return_value=[
        {"id": "msg_otp", "threadId": "thread_otp"},
        {"id": "msg_unrelated", "threadId": "thread_unrelated"},
        {"id": "msg_reply", "threadId": "outreach_thread_123"},
    ])

    async def mock_get_message_detail(access_token, message_id):
        if message_id == "msg_otp":
            return {
                "gmail_message_id": "msg_otp",
                "gmail_thread_id": "thread_otp",
                "from_address": "no-reply@salesgenie.ai",
                "clean_from": "no-reply@salesgenie.ai",
                "subject": "Your verification code is 987654",
                "snippet": "Use this OTP code to sign in",
                "body_text": "Your verification code is 987654",
            }
        elif message_id == "msg_unrelated":
            return {
                "gmail_message_id": "msg_unrelated",
                "gmail_thread_id": "thread_unrelated",
                "from_address": "random@somewhere.com",
                "clean_from": "random@somewhere.com",
                "subject": "Random newsletter",
                "snippet": "Weekly digest...",
                "body_text": "Here is the digest",
            }
        elif message_id == "msg_reply":
            return {
                "gmail_message_id": "msg_reply",
                "gmail_thread_id": "outreach_thread_123",
                "from_address": "lead@target.com",
                "clean_from": "lead@target.com",
                "subject": "Re: SalesGenie Product Demo",
                "snippet": "Yes, Thursday at 2pm works perfectly for us!",
                "body_text": "Yes, Thursday at 2pm works perfectly for us!",
                "in_reply_to": "outreach_msg_001",
            }
        return None

    mock_client.get_message_detail = AsyncMock(side_effect=mock_get_message_detail)

    # Mock notification service
    svc.notification_service.notify_email_activity = AsyncMock()

    sync_response = await svc.sync_relevant_emails(current_user=current_user)

    assert sync_response.success is True
    # Only msg_reply should have been processed! msg_otp and msg_unrelated filtered out
    assert sync_response.synced_count == 1
    assert sync_response.new_replies_count == 1

    # Verify notification was called with gmail_message_id for idempotency
    svc.notification_service.notify_email_activity.assert_called_once()
    call_kwargs = svc.notification_service.notify_email_activity.call_args[1]
    assert call_kwargs["gmail_message_id"] == "msg_reply"
    assert call_kwargs["lead_id"] == lead_id
    assert call_kwargs["subject"] == "Re: SalesGenie Product Demo"

    # Verify DB interaction was added only for msg_reply
    assert mock_db.add.call_count == 1
    added_si = mock_db.add.call_args[0][0]
    assert isinstance(added_si, SalesInteraction)
    assert added_si.lead_id == lead_id
    assert added_si.action_items[0]["gmail_message_id"] == "msg_reply"


@pytest.mark.asyncio
async def test_sync_idempotency_skips_already_logged_messages():
    """
    Verify that sync_relevant_emails does not re-process or re-notify for
    already logged gmail_message_ids.
    """
    mock_db = AsyncMock()
    mock_client = MagicMock(spec=GmailClient)

    current_user = User(id=uuid.uuid4(), email="rep@mycompany.com")
    lead_id = uuid.uuid4()
    mock_lead = Lead(id=lead_id, email="lead@target.com")

    # Integration
    mock_integration = EmailIntegration(
        id=uuid.uuid4(),
        user_id=current_user.id,
        provider=EmailProviderType.GMAIL,
        provider_email="rep@mycompany.com",
        access_token_encrypted=_encrypt_token("mock_access_token"),
        refresh_token_encrypted=_encrypt_token("mock_refresh_token"),
        status=IntegrationStatus.CONNECTED,
        metadata_json={
            "outreach_threads": {
                "th_existing": {
                    "lead_id": str(lead_id),
                    "lead_email": "lead@target.com",
                    "initial_message_id": "outreach_1",
                    "subject": "Intro",
                }
            }
        },
    )

    svc = GmailIntegrationService(mock_db, gmail_client=mock_client)
    svc.get_integration = AsyncMock(return_value=mock_integration)
    svc.get_valid_access_token = AsyncMock(return_value="mock_access_token")

    # Mock DB queries:
    # SalesInteraction ALREADY has an interaction with gmail_message_id = "msg_already_logged"
    mock_existing_si = SalesInteraction(
        id=uuid.uuid4(),
        lead_id=lead_id,
        action_items=[{"gmail_message_id": "msg_already_logged", "type": "gmail_customer_reply"}],
    )

    mock_lead_res = MagicMock()
    mock_lead_res.scalars.return_value.all.return_value = [mock_lead]
    mock_contact_res = MagicMock()
    mock_contact_res.scalars.return_value.all.return_value = []
    mock_si_res = MagicMock()
    mock_si_res.scalars.return_value.all.return_value = [mock_existing_si]

    mock_db.execute = AsyncMock(side_effect=[mock_lead_res, mock_contact_res, mock_si_res])

    # Gmail returns msg_already_logged
    mock_client.query_messages = AsyncMock(return_value=[
        {"id": "msg_already_logged", "threadId": "th_existing"},
    ])
    mock_client.get_message_detail = AsyncMock()
    svc.notification_service.notify_email_activity = AsyncMock()

    sync_res = await svc.sync_relevant_emails(current_user=current_user)

    assert sync_res.success is True
    # Should skip already logged message completely!
    assert sync_res.synced_count == 0
    assert sync_res.new_replies_count == 0
    mock_client.get_message_detail.assert_not_called()
    svc.notification_service.notify_email_activity.assert_not_called()
    assert mock_db.add.call_count == 0


@pytest.mark.asyncio
async def test_sync_matches_rfc_in_reply_to_header():
    """
    Verify that a reply whose in_reply_to references a known outreach initial message ID
    is properly recognized and matched even across different thread identifiers.
    """
    mock_db = AsyncMock()
    mock_client = MagicMock(spec=GmailClient)

    current_user = User(id=uuid.uuid4(), email="rep@mycompany.com")
    lead_id = uuid.uuid4()
    mock_lead = Lead(id=lead_id, email="prospect@acme.com", contact_name="Alice", company_name="Acme")

    # Past outreach message ID stored in metadata
    mock_integration = EmailIntegration(
        id=uuid.uuid4(),
        user_id=current_user.id,
        provider=EmailProviderType.GMAIL,
        provider_email="rep@mycompany.com",
        access_token_encrypted=_encrypt_token("mock_access_token"),
        refresh_token_encrypted=_encrypt_token("mock_refresh_token"),
        status=IntegrationStatus.CONNECTED,
        metadata_json={
            "outreach_threads": {
                "thread_old": {
                    "lead_id": str(lead_id),
                    "lead_email": "prospect@acme.com",
                    "initial_message_id": "salesgenie_initial_msg_999",
                    "subject": "Quick question",
                }
            }
        },
    )

    svc = GmailIntegrationService(mock_db, gmail_client=mock_client)
    svc.get_integration = AsyncMock(return_value=mock_integration)
    svc.get_valid_access_token = AsyncMock(return_value="mock_access_token")

    mock_lead_res = MagicMock()
    mock_lead_res.scalars.return_value.all.return_value = [mock_lead]
    mock_contact_res = MagicMock()
    mock_contact_res.scalars.return_value.all.return_value = []
    mock_si_res = MagicMock()
    mock_si_res.scalars.return_value.all.return_value = []

    mock_db.execute = AsyncMock(side_effect=[mock_lead_res, mock_contact_res, mock_si_res])

    mock_client.query_messages = AsyncMock(return_value=[
        {"id": "reply_via_in_reply_to", "threadId": "new_thread_id"},
    ])
    mock_client.get_message_detail = AsyncMock(return_value={
        "gmail_message_id": "reply_via_in_reply_to",
        "gmail_thread_id": "new_thread_id",
        "from_address": "prospect@acme.com",
        "clean_from": "prospect@acme.com",
        "subject": "Re: Quick question",
        "snippet": "I am interested, send over more info",
        "body_text": "I am interested, send over more info",
        "in_reply_to": "salesgenie_initial_msg_999",
    })

    svc.notification_service.notify_email_activity = AsyncMock()

    sync_res = await svc.sync_relevant_emails(current_user=current_user)

    assert sync_res.success is True
    assert sync_res.synced_count == 1
    assert sync_res.new_replies_count == 1

    svc.notification_service.notify_email_activity.assert_called_once()
    call_args = svc.notification_service.notify_email_activity.call_args[1]
    assert call_args["gmail_message_id"] == "reply_via_in_reply_to"
    assert call_args["lead_id"] == lead_id

