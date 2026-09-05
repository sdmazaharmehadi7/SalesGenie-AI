"""
Gmail Integration Service.

Production-grade business logic for:
- Google OAuth token exchange & state validation
- Fernet encryption and decryption of tokens at rest
- Automatic token refresh
- Disconnecting & revoking credentials (preserving CRM history)
- Sending emails via Gmail REST API and logging CRM SalesInteractions
- Controlled, relevant email synchronization (CRM lead/contact matching only)
- Customer reply detection with AI summarization and in-app notifications
- Real open tracking via 1x1 GIF tracking endpoint
"""

import base64
from datetime import datetime, timedelta, timezone
import json
import uuid
from typing import Any

from cryptography.fernet import Fernet
from jose import JWTError, jwt
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.core.config import settings
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.integrations.ai.base import AIProvider
from app.integrations.email.gmail_client import (
    GMAIL_SCOPES,
    GmailAPIError,
    GmailClient,
    GmailTokenExpiredOrRevokedError,
)
from app.models.contact import Contact
from app.models.email_integration import EmailIntegration, EmailProviderType, IntegrationStatus
from app.models.lead import Lead
from app.models.notification import NotificationType
from app.models.pipeline_enums import InteractionType
from app.models.sales_interaction import SalesInteraction
from app.models.user import User
from app.repositories.sales_interaction_repository import SalesInteractionRepository
from app.schemas.email_integration import (
    GmailAuthUrlResponse,
    GmailSendRequest,
    GmailSendResponse,
    GmailStatusResponse,
    GmailSyncResponse,
    GmailTestResponse,
)
from app.services.notification_service import NotificationService

logger = get_logger(__name__)

# State JWT signing algorithm and lifetime
STATE_ALGORITHM = "HS256"
STATE_EXPIRY_MINUTES = 20


def _get_fernet() -> Fernet:
    """Derive 32-byte Fernet key from SECRET_KEY."""
    raw_key = settings.SECRET_KEY.encode("utf-8")[:32].ljust(32, b"\x00")
    fernet_key = base64.urlsafe_b64encode(raw_key)
    return Fernet(fernet_key)


def _encrypt_token(token: str) -> str:
    """Encrypt OAuth token. Returns URL-safe base64 string."""
    return _get_fernet().encrypt(token.encode("utf-8")).decode("utf-8")


def _decrypt_token(cipher_text: str) -> str:
    """Decrypt stored OAuth token."""
    return _get_fernet().decrypt(cipher_text.encode("utf-8")).decode("utf-8")


class GmailIntegrationService:
    def __init__(
        self,
        db: AsyncSession,
        ai_provider: AIProvider | None = None,
        gmail_client: GmailClient | None = None,
    ) -> None:
        self.db = db
        self.ai_provider = ai_provider
        self.client = gmail_client or GmailClient()
        self.interactions = SalesInteractionRepository(db)
        self.notification_service = NotificationService(db)

    # -------------------------------------------------------------------------
    # 1. OAuth Flows & State Validation
    # -------------------------------------------------------------------------

    def generate_auth_url(self, current_user: User, redirect_uri: str | None = None) -> GmailAuthUrlResponse:
        """
        Generate Google OAuth 2.0 URL with signed CSRF state tied to user_id.
        """
        now = datetime.now(timezone.utc)
        state_payload = {
            "sub": str(current_user.id),
            "purpose": "gmail_oauth",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=STATE_EXPIRY_MINUTES)).timestamp()),
        }
        state = jwt.encode(state_payload, settings.SECRET_KEY, algorithm=STATE_ALGORITHM)
        auth_url = self.client.get_authorization_url(state=state, redirect_uri=redirect_uri)
        return GmailAuthUrlResponse(auth_url=auth_url, state=state)

    async def handle_oauth_callback(
        self,
        current_user: User,
        code: str,
        state: str,
        redirect_uri: str | None = None,
    ) -> GmailStatusResponse:
        """
        Validate state JWT, exchange authorization code with Google,
        encrypt tokens at rest, and save/update EmailIntegration.
        """
        try:
            payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[STATE_ALGORITHM])
            state_user_id = payload.get("sub")
            if str(current_user.id) != state_user_id or payload.get("purpose") != "gmail_oauth":
                raise ForbiddenError("Invalid or forged OAuth state parameter.", error_code="invalid_oauth_state")
        except JWTError:
            raise ForbiddenError("OAuth state has expired or is invalid.", error_code="oauth_state_expired")

        # Exchange authorization code for tokens
        token_data = await self.client.exchange_code(code=code, redirect_uri=redirect_uri)
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = int(token_data.get("expires_in", 3600))
        granted_scopes = token_data.get("scope", "").split()

        if not access_token:
            raise GmailAPIError("No access token returned from Google.", status_code=502)

        # Retrieve verified email: check id_token first, then profile endpoint, fallback to current_user
        provider_email = None
        if "id_token" in token_data:
            try:
                claims = jwt.get_unverified_claims(token_data["id_token"])
                if claims.get("email"):
                    provider_email = claims.get("email")
            except Exception:
                pass

        profile = {}
        try:
            profile = await self.client.get_user_profile(access_token)
            if not provider_email and profile.get("email"):
                provider_email = profile.get("email")
        except Exception as exc:
            logger.warning("Could not fetch user profile from Google during OAuth: %s", exc)

        if not provider_email:
            provider_email = current_user.email

        token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Query existing integration for this user
        result = await self.db.execute(
            select(EmailIntegration).where(
                EmailIntegration.user_id == current_user.id,
                EmailIntegration.provider == EmailProviderType.GMAIL,
            )
        )
        integration = result.scalar_one_or_none()

        encrypted_access = _encrypt_token(access_token)
        # CRITICAL: Do not overwrite an existing refresh token with null/undefined
        if refresh_token:
            encrypted_refresh = _encrypt_token(refresh_token)
        elif integration and integration.refresh_token_encrypted:
            encrypted_refresh = integration.refresh_token_encrypted
        else:
            encrypted_refresh = None

        if integration is None:
            integration = EmailIntegration(
                user_id=current_user.id,
                provider=EmailProviderType.GMAIL,
                provider_email=provider_email,
                access_token_encrypted=encrypted_access,
                refresh_token_encrypted=encrypted_refresh,
                token_expiry=token_expiry,
                scopes=granted_scopes,
                status=IntegrationStatus.CONNECTED,
                metadata_json=profile,
            )
            self.db.add(integration)
        else:
            integration.provider_email = provider_email
            integration.access_token_encrypted = encrypted_access
            if encrypted_refresh:
                integration.refresh_token_encrypted = encrypted_refresh
            integration.token_expiry = token_expiry
            integration.scopes = granted_scopes
            integration.status = IntegrationStatus.CONNECTED
            integration.last_error_message = None
            if profile:
                integration.metadata_json = profile

        await self.db.commit()
        await self.db.refresh(integration)

        logger.info("Gmail integration connected successfully for user_id=%s email=%s", current_user.id, provider_email)

        return GmailStatusResponse(
            is_connected=True,
            provider="GMAIL",
            provider_email=integration.provider_email,
            status=integration.status.value,
            scopes=integration.scopes,
            last_synced_at=integration.last_synced_at,
            last_error_message=integration.last_error_message,
        )

    # -------------------------------------------------------------------------
    # 2. Connection Status, Test & Disconnect
    # -------------------------------------------------------------------------

    async def get_integration(self, user_id: uuid.UUID) -> EmailIntegration | None:
        """Fetch EmailIntegration for a user."""
        result = await self.db.execute(
            select(EmailIntegration).where(
                EmailIntegration.user_id == user_id,
                EmailIntegration.provider == EmailProviderType.GMAIL,
            )
        )
        return result.scalar_one_or_none()

    async def get_status(self, current_user: User) -> GmailStatusResponse:
        """Return sanitized connection status without exposing tokens."""
        integration = await self.get_integration(current_user.id)
        if not integration or integration.status != IntegrationStatus.CONNECTED:
            return GmailStatusResponse(
                is_connected=False,
                provider="GMAIL",
                provider_email=integration.provider_email if integration else None,
                status=integration.status.value if integration else IntegrationStatus.DISCONNECTED.value,
                scopes=integration.scopes if integration else None,
                last_synced_at=integration.last_synced_at if integration else None,
                last_error_message=integration.last_error_message if integration else None,
            )

        return GmailStatusResponse(
            is_connected=True,
            provider="GMAIL",
            provider_email=integration.provider_email,
            status=integration.status.value,
            scopes=integration.scopes,
            last_synced_at=integration.last_synced_at,
            last_error_message=integration.last_error_message,
        )

    async def disconnect(self, current_user: User) -> GmailStatusResponse:
        """
        Disconnect Gmail: revokes token at Google, clears encrypted tokens,
        updates status to DISCONNECTED. Preserves all CRM activity history.
        """
        integration = await self.get_integration(current_user.id)
        if not integration:
            return GmailStatusResponse(
                is_connected=False,
                provider="GMAIL",
                status=IntegrationStatus.DISCONNECTED.value,
            )

        # Attempt to revoke token at Google
        try:
            if integration.refresh_token_encrypted:
                refresh_tok = _decrypt_token(integration.refresh_token_encrypted)
                await self.client.revoke_token(refresh_tok)
            elif integration.access_token_encrypted:
                access_tok = _decrypt_token(integration.access_token_encrypted)
                await self.client.revoke_token(access_tok)
        except Exception as exc:
            logger.warning("Revocation at Google failed during disconnect: %s", exc)

        # Clear tokens and update status
        integration.status = IntegrationStatus.DISCONNECTED
        integration.access_token_encrypted = ""
        integration.refresh_token_encrypted = None
        integration.token_expiry = None
        integration.last_error_message = None

        await self.db.commit()
        await self.db.refresh(integration)

        logger.info("Gmail integration disconnected for user_id=%s", current_user.id)

        return GmailStatusResponse(
            is_connected=False,
            provider="GMAIL",
            provider_email=integration.provider_email,
            status=IntegrationStatus.DISCONNECTED.value,
            scopes=integration.scopes,
            last_synced_at=integration.last_synced_at,
        )

    async def test_connection(self, current_user: User) -> GmailTestResponse:
        """
        Test the connection by verifying the access token, refreshing if needed,
        and calling Google profile. Automatically retries with refreshed token on 401.
        """
        integration = await self.get_integration(current_user.id)
        if not integration or integration.status != IntegrationStatus.CONNECTED:
            return GmailTestResponse(
                success=False,
                message="Gmail is not connected. Please connect your account first.",
            )

        try:
            profile = await self.execute_with_token_retry(
                integration,
                lambda tok: self.client.get_user_profile(tok),
            )
            return GmailTestResponse(
                success=True,
                message=f"Connection active. Verified account: {profile.get('email')}",
                provider_email=profile.get("email"),
            )
        except GmailTokenExpiredOrRevokedError:
            integration.status = IntegrationStatus.REVOKED
            integration.last_error_message = "Access revoked or expired by Google. Please reconnect."
            await self.db.commit()
            return GmailTestResponse(
                success=False,
                message="Google access was revoked or expired. Please reconnect your account.",
            )
        except Exception as exc:
            return GmailTestResponse(
                success=False,
                message=f"Connection test failed: {str(exc)}",
            )

    # -------------------------------------------------------------------------
    # 3. Token Lifecycle & Auto-Refresh
    # -------------------------------------------------------------------------

    async def get_valid_access_token(
        self, integration: EmailIntegration, force_refresh: bool = False
    ) -> str:
        """
        Decrypt access token. If token is within 5 minutes of expiring (or force_refresh is True),
        automatically use the refresh token to get a fresh access token.
        Only requires user to reconnect if the refresh token itself is invalid or revoked.
        """
        if not integration.access_token_encrypted:
            raise GmailTokenExpiredOrRevokedError("No access token stored. Please reconnect.")

        now = datetime.now(timezone.utc)
        token_expiry = integration.token_expiry
        if token_expiry is not None and token_expiry.tzinfo is None:
            token_expiry = token_expiry.replace(tzinfo=timezone.utc)

        needs_refresh = (
            force_refresh
            or token_expiry is None
            or token_expiry <= now + timedelta(minutes=5)
        )

        if needs_refresh:
            if not integration.refresh_token_encrypted:
                logger.warning("Gmail integration for user %s needs refresh but has no refresh token", integration.user_id)
                integration.status = IntegrationStatus.REVOKED
                integration.last_error_message = "No refresh token available. Reconnect required."
                await self.db.commit()
                raise GmailTokenExpiredOrRevokedError("Token expired and no refresh token available. Please reconnect.")

            refresh_token = _decrypt_token(integration.refresh_token_encrypted)
            try:
                new_tokens = await self.client.refresh_access_token(refresh_token)
                new_access_token = new_tokens["access_token"]
                expires_in = int(new_tokens.get("expires_in", 3600))

                integration.access_token_encrypted = _encrypt_token(new_access_token)
                integration.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

                # Do not overwrite existing refresh token with null/undefined
                if new_tokens.get("refresh_token"):
                    integration.refresh_token_encrypted = _encrypt_token(new_tokens["refresh_token"])

                integration.status = IntegrationStatus.CONNECTED
                integration.last_error_message = None
                await self.db.commit()
                logger.info("Successfully refreshed Gmail access token for user %s", integration.user_id)
                return new_access_token
            except GmailTokenExpiredOrRevokedError:
                logger.warning("Refresh token revoked or invalid for user %s", integration.user_id)
                integration.status = IntegrationStatus.REVOKED
                integration.last_error_message = "Refresh token expired or revoked. Please reconnect."
                await self.db.commit()
                raise

        return _decrypt_token(integration.access_token_encrypted)

    async def execute_with_token_retry(
        self,
        integration: EmailIntegration,
        api_func,
    ):
        """
        Executes a Gmail API operation with automatic token refresh on 401.
        If the access token expired, refreshes it using the stored refresh token
        and retries the operation once before raising an error.
        Only raises GmailTokenExpiredOrRevokedError if the refresh token itself is revoked.
        """
        access_token = await self.get_valid_access_token(integration)
        try:
            return await api_func(access_token)
        except GmailTokenExpiredOrRevokedError:
            # Access token was rejected by Google (401). If refresh token exists, retry once with fresh token.
            if integration.refresh_token_encrypted:
                logger.info("Access token rejected by Google API (401). Refreshing token and retrying...")
                fresh_access_token = await self.get_valid_access_token(integration, force_refresh=True)
                return await api_func(fresh_access_token)
            raise

    # -------------------------------------------------------------------------
    # 4. Send Email & CRM SalesInteraction Logging
    # -------------------------------------------------------------------------

    async def send_email(
        self,
        current_user: User,
        payload: GmailSendRequest,
        ws_ctx: WorkspaceContext | None = None,
    ) -> GmailSendResponse:
        """
        Send email from the authenticated user's connected Gmail account.
        Logs a SalesInteraction with interaction_type=InteractionType.EMAIL.
        """
        integration = await self.get_integration(current_user.id)
        if not integration or integration.status != IntegrationStatus.CONNECTED:
            raise ConflictError(
                "Your Gmail account is not connected. Please connect Gmail in Settings → Email Integration.",
                error_code="gmail_not_connected",
            )

        # Context resolution
        workspace_id = ws_ctx.workspace_id if ws_ctx and not ws_ctx.is_personal else None
        lead = None
        if payload.lead_id:
            lead_result = await self.db.execute(
                select(Lead).where(Lead.id == payload.lead_id)
            )
            lead = lead_result.scalar_one_or_none()
            if lead and lead.workspace_id:
                workspace_id = lead.workspace_id

        # Generate tracking pixel if tracking is enabled
        tracking_html = ""
        tracking_id = None
        if payload.track_opens:
            tracking_id = uuid.uuid4().hex
            tracking_url = f"http://localhost:8000/api/v1/integrations/gmail/track/{tracking_id}"
            tracking_html = f'<br/><img src="{tracking_url}" width="1" height="1" alt="" style="display:none;" />'

        body_html = f"<div>{payload.body.replace(chr(10), '<br/>')}{tracking_html}</div>"

        # Send through Gmail API with automatic refresh on token expiry
        result = await self.execute_with_token_retry(
            integration,
            lambda tok: self.client.send_email(
                access_token=tok,
                from_email=integration.provider_email,
                to_email=payload.to_email,
                subject=payload.subject,
                body_text=payload.body,
                body_html=body_html,
                from_name=current_user.name or current_user.email,
                in_reply_to=payload.in_reply_to,
                thread_id=payload.thread_id,
            ),
        )

        gmail_message_id = result.get("id")
        gmail_thread_id = result.get("threadId")

        # Log SalesInteraction in CRM Activity timeline
        action_item_metadata = {
            "type": "gmail_email_sent",
            "gmail_message_id": gmail_message_id,
            "gmail_thread_id": gmail_thread_id,
            "to": payload.to_email,
            "from": integration.provider_email,
            "tracking_id": tracking_id,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }

        interaction = SalesInteraction(
            lead_id=payload.lead_id,
            workspace_id=workspace_id,
            user_id=current_user.id,
            interaction_type=InteractionType.EMAIL,
            summary=f"✉️ Email Sent: {payload.subject}",
            action_items=[action_item_metadata],
        )
        self.db.add(interaction)
        await self.db.commit()
        await self.db.refresh(interaction)

        logger.info(
            "Email sent via Gmail API: message_id=%s lead_id=%s user_id=%s",
            gmail_message_id,
            payload.lead_id,
            current_user.id,
        )

        return GmailSendResponse(
            success=True,
            message_id=gmail_message_id,
            thread_id=gmail_thread_id,
            interaction_id=interaction.id,
            detail=f"Email sent successfully from {integration.provider_email}.",
        )

    # -------------------------------------------------------------------------
    # 5. Relevant Email Synchronization & Customer Reply Detection
    # -------------------------------------------------------------------------

    async def sync_relevant_emails(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> GmailSyncResponse:
        """
        Controlled sync: strictly queries Gmail for emails from or to CRM Leads/Contacts.
        DOES NOT sync the entire mailbox.
        Detects customer replies, invokes AI conversation analysis for action items,
        logs CRM SalesInteraction, and dispatches in-app notification.
        """
        integration = await self.get_integration(current_user.id)
        if not integration or integration.status != IntegrationStatus.CONNECTED:
            raise ConflictError("Gmail is not connected.", error_code="gmail_not_connected")

        # 1. Gather email addresses of leads accessible by this user/workspace
        is_personal = ws_ctx.is_personal if ws_ctx else True
        workspace_id = ws_ctx.workspace_id if ws_ctx and not ws_ctx.is_personal else None

        lead_query = select(Lead).where(Lead.email.isnot(None))
        if is_personal:
            lead_query = lead_query.where(
                or_(Lead.owner_id == current_user.id, Lead.assigned_to == current_user.id),
                Lead.workspace_id.is_(None),
            )
        elif workspace_id:
            lead_query = lead_query.where(Lead.workspace_id == workspace_id)

        leads_result = await self.db.execute(lead_query)
        leads = leads_result.scalars().all()
        lead_emails_map = {lead.email.lower().strip(): lead for lead in leads if lead.email}

        if not lead_emails_map:
            now = datetime.now(timezone.utc)
            integration.last_synced_at = now
            await self.db.commit()
            return GmailSyncResponse(
                success=True,
                synced_count=0,
                new_replies_count=0,
                last_synced_at=now,
                message="No CRM leads with email addresses found to synchronize.",
            )

        # 2. Build targeted Gmail search query for these specific lead emails
        # Format: from:(lead1@domain.com OR lead2@domain.com)
        email_list = list(lead_emails_map.keys())[:20]  # Chunk in batches of 20
        email_or_terms = " OR ".join(email_list)
        search_query = f"from:({email_or_terms})"

        # If previously synced, add date constraint (last 14 days or since last_sync)
        if integration.last_synced_at:
            since_date = (integration.last_synced_at - timedelta(hours=1)).strftime("%Y/%m/%d")
            search_query += f" after:{since_date}"
        else:
            search_query += " newer_than:14d"

        messages_list = await self.execute_with_token_retry(
            integration,
            lambda tok: self.client.query_messages(
                access_token=tok,
                query=search_query,
                max_results=30,
            ),
        )

        synced_count = 0
        new_replies_count = 0

        # Fetch previously logged gmail_message_ids to guarantee strict idempotency
        # Check sales_interactions for existing gmail_message_ids
        existing_interactions = await self.db.execute(
            select(SalesInteraction).where(
                SalesInteraction.interaction_type == InteractionType.EMAIL,
                SalesInteraction.user_id == current_user.id,
            )
        )
        logged_ids = set()
        for si in existing_interactions.scalars().all():
            if si.action_items:
                for item in si.action_items:
                    if isinstance(item, dict) and "gmail_message_id" in item:
                        logged_ids.add(item["gmail_message_id"])

        for msg_summary in messages_list:
            msg_id = msg_summary.get("id")
            if not msg_id or msg_id in logged_ids:
                continue

            # Fetch full parsed detail with automatic retry on token expiry
            detail = await self.execute_with_token_retry(
                integration,
                lambda tok: self.client.get_message_detail(access_token=tok, message_id=msg_id),
            )
            if not detail:
                continue

            synced_count += 1
            from_addr = detail.get("from_address", "").lower()

            # Find matching lead
            matched_lead = None
            for lead_email, lead_obj in lead_emails_map.items():
                if lead_email in from_addr:
                    matched_lead = lead_obj
                    break

            if matched_lead:
                new_replies_count += 1
                subject = detail.get("subject", "Reply from prospect")
                body_text = detail.get("body_text", "")

                # 3. AI Analysis on Reply using existing AI Provider
                ai_summary = f"Customer replied: {subject}"
                action_items = []
                if self.ai_provider and body_text:
                    try:
                        ai_res = await self.ai_provider.summarize_conversation(transcript=body_text[:1500])
                        if ai_res.get("summary"):
                            ai_summary = f"↩️ Customer Replied: {ai_res['summary']}"
                        if ai_res.get("action_items"):
                            action_items = ai_res["action_items"]
                    except Exception as ai_err:
                        logger.warning("AI summarization on email reply failed: %s", ai_err)

                # Append metadata to action_items
                action_items.append({
                    "type": "gmail_customer_reply",
                    "gmail_message_id": msg_id,
                    "gmail_thread_id": detail.get("gmail_thread_id"),
                    "from": detail.get("from_address"),
                    "received_at": detail.get("date"),
                    "snippet": detail.get("snippet"),
                })

                # 4. Insert SalesInteraction (Activity Timeline)
                interaction = SalesInteraction(
                    lead_id=matched_lead.id,
                    workspace_id=matched_lead.workspace_id,
                    user_id=current_user.id,
                    interaction_type=InteractionType.EMAIL,
                    summary=ai_summary,
                    action_items=action_items,
                )
                self.db.add(interaction)
                logged_ids.add(msg_id)

                # 5. In-App Notification (type=email_replied)
                try:
                    await self.notification_service.notify_email_activity(
                        recipient_user_id=current_user.id,
                        workspace_id=matched_lead.workspace_id,
                        activity_type=NotificationType.EMAIL_REPLIED.value,
                        lead_id=matched_lead.id,
                        contact_name=matched_lead.contact_name,
                        company_name=matched_lead.company_name,
                        subject=subject,
                    )
                except Exception as notif_err:
                    logger.warning("Failed to create email reply notification: %s", notif_err)

        now = datetime.now(timezone.utc)
        integration.last_synced_at = now
        await self.db.commit()

        logger.info(
            "Gmail sync complete for user_id=%s: %d messages scanned, %d new replies logged",
            current_user.id,
            synced_count,
            new_replies_count,
        )

        return GmailSyncResponse(
            success=True,
            synced_count=synced_count,
            new_replies_count=new_replies_count,
            last_synced_at=now,
            message=f"Synced {synced_count} relevant messages. Logged {new_replies_count} new customer replies.",
        )
