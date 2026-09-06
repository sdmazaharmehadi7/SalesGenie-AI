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
import email.utils
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
        Stores Gmail message ID, thread ID, lead ID, and contact ID in SalesInteraction
        and EmailIntegration.metadata_json["outreach_threads"] for future reply tracking.
        """
        integration = await self.get_integration(current_user.id)
        if not integration or integration.status != IntegrationStatus.CONNECTED:
            raise ConflictError(
                "Your Gmail account is not connected. Please connect Gmail in Settings → Email Integration.",
                error_code="gmail_not_connected",
            )

        # Context & entity resolution
        is_personal = ws_ctx.is_personal if ws_ctx else True
        workspace_id = ws_ctx.workspace_id if ws_ctx and not ws_ctx.is_personal else None
        lead_id = payload.lead_id
        contact_id = getattr(payload, "contact_id", None)
        target_email = payload.to_email.strip().lower()

        lead = None
        if lead_id:
            lead_result = await self.db.execute(
                select(Lead).where(Lead.id == lead_id)
            )
            lead = lead_result.scalar_one_or_none()
            if lead and lead.workspace_id:
                workspace_id = lead.workspace_id
        else:
            lead_query = select(Lead).where(Lead.email.ilike(target_email))
            if is_personal:
                lead_query = lead_query.where(
                    or_(Lead.owner_id == current_user.id, Lead.assigned_to == current_user.id),
                    Lead.workspace_id.is_(None),
                )
            elif workspace_id:
                lead_query = lead_query.where(Lead.workspace_id == workspace_id)

            lead_res = await self.db.execute(lead_query)
            lead = lead_res.scalars().first()
            if lead:
                lead_id = lead.id
                if lead.workspace_id:
                    workspace_id = lead.workspace_id

        if not contact_id:
            contact_query = select(Contact).where(Contact.email.ilike(target_email))
            if is_personal:
                contact_query = contact_query.where(
                    Contact.owner_id == current_user.id,
                    Contact.workspace_id.is_(None),
                )
            elif workspace_id:
                contact_query = contact_query.where(Contact.workspace_id == workspace_id)

            contact_res = await self.db.execute(contact_query)
            contact = contact_res.scalars().first()
            if contact:
                contact_id = contact.id

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
                references=getattr(payload, "references", None),
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
            "lead_id": str(lead_id) if lead_id else None,
            "contact_id": str(contact_id) if contact_id else None,
            "to": payload.to_email,
            "from": integration.provider_email,
            "subject": payload.subject,
            "tracking_id": tracking_id,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }

        interaction = SalesInteraction(
            lead_id=lead_id,
            contact_id=contact_id,
            workspace_id=workspace_id,
            user_id=current_user.id,
            interaction_type=InteractionType.EMAIL,
            summary=f"✉️ Email Sent: {payload.subject}",
            action_items=[action_item_metadata],
        )
        self.db.add(interaction)

        # Store outreach thread in integration metadata for matching future replies
        meta = dict(integration.metadata_json or {})
        outreach_threads = dict(meta.get("outreach_threads") or {})
        if gmail_thread_id:
            outreach_threads[gmail_thread_id] = {
                "lead_id": str(lead_id) if lead_id else None,
                "contact_id": str(contact_id) if contact_id else None,
                "lead_email": target_email,
                "initial_message_id": gmail_message_id,
                "subject": payload.subject,
                "sent_at": datetime.now(timezone.utc).isoformat(),
            }
            meta["outreach_threads"] = outreach_threads
            integration.metadata_json = meta

        await self.db.commit()
        await self.db.refresh(interaction)

        logger.info(
            "Email sent via Gmail API: message_id=%s thread_id=%s lead_id=%s contact_id=%s user_id=%s",
            gmail_message_id,
            gmail_thread_id,
            lead_id,
            contact_id,
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
    # 5. Helper: System, Auth, OTP, and Invitation Email Filtering
    # -------------------------------------------------------------------------

    @staticmethod
    def is_system_or_auth_email(detail: dict[str, Any], user_email: str | None = None) -> bool:
        """
        Detect OTP, verification, invitation, system, transactional, or self-sent emails.
        Such emails MUST NEVER create notifications or CRM activities.
        """
        clean_from = (detail.get("clean_from") or "").lower().strip()
        from_raw = (detail.get("from_address") or "").lower().strip()
        subject = (detail.get("subject") or "").lower().strip()
        snippet = (detail.get("snippet") or "").lower().strip()

        # 1. Ignore emails sent by the user themselves
        if user_email and clean_from == user_email.lower().strip():
            return True

        # 2. Automated & system senders
        system_sender_patterns = (
            "noreply@",
            "no-reply@",
            "donotreply@",
            "do-not-reply@",
            "notifications@",
            "mailer-daemon@",
            "postmaster@",
            "system@",
            "security@",
            "auth@",
            "verify@",
            "accounts.google.com",
            "google.com",
            "firebase",
            "auth0.com",
            "supabase.co",
            "github.com",
            "support@",
            "billing@",
            "alert@",
            "alerts@",
        )
        if any(pat in clean_from or pat in from_raw for pat in system_sender_patterns):
            return True

        # 3. OTP, Verification, and Authentication subjects/snippets
        auth_keywords = (
            "otp",
            "one-time password",
            "onetime password",
            "verification code",
            "verify your email",
            "email verification",
            "confirm your email",
            "confirm email",
            "security code",
            "password reset",
            "reset your password",
            "magic link",
            "login code",
            "security alert",
            "sign-in code",
            "two-factor",
            "2fa",
            "mfa code",
            "authorization code",
            "temporary access code",
            "confirm your account",
        )
        if any(kw in subject for kw in auth_keywords) or any(kw in snippet for kw in auth_keywords):
            return True

        # 4. SalesGenie / Workspace invitation keywords
        invitation_keywords = (
            "invitation to join",
            "invited you to join",
            "workspace invitation",
            "join your team",
            "you've been invited",
            "you have been invited",
            "team invitation",
            "welcome to salesgenie",
            "invited to workspace",
        )
        if any(kw in subject for kw in invitation_keywords) or any(kw in snippet for kw in invitation_keywords):
            return True

        # 5. Billing / Transactional notifications
        billing_keywords = (
            "invoice payment",
            "payment receipt",
            "subscription confirmed",
            "billing receipt",
            "statement available",
        )
        if any(kw in subject for kw in billing_keywords):
            return True

        return False

    # -------------------------------------------------------------------------
    # 6. Relevant Email Synchronization & Customer Reply Detection
    # -------------------------------------------------------------------------

    async def sync_relevant_emails(
        self,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
    ) -> GmailSyncResponse:
        """
        Controlled sync: strictly queries Gmail for emails related to CRM lead outreach.
        Only processes:
        - Outreach threads initiated by SalesGenie
        - Replies from corresponding leads
        - Relevant conversation messages for those leads

        Strictly ignores system, auth, OTP, invitation, or unrelated emails.
        Guarantees idempotency and prevents duplicate notifications/activities.
        """
        integration = await self.get_integration(current_user.id)
        if not integration or integration.status != IntegrationStatus.CONNECTED:
            raise ConflictError("Gmail is not connected.", error_code="gmail_not_connected")

        # 1. Gather CRM leads and contacts accessible in this context
        is_personal = ws_ctx.is_personal if ws_ctx else True
        workspace_id = ws_ctx.workspace_id if ws_ctx and not ws_ctx.is_personal else None

        lead_query = select(Lead).where(Lead.email.isnot(None))
        contact_query = select(Contact).where(Contact.email.isnot(None))
        if is_personal:
            lead_query = lead_query.where(
                or_(Lead.owner_id == current_user.id, Lead.assigned_to == current_user.id),
                Lead.workspace_id.is_(None),
            )
            contact_query = contact_query.where(
                Contact.owner_id == current_user.id,
                Contact.workspace_id.is_(None),
            )
        elif workspace_id:
            lead_query = lead_query.where(Lead.workspace_id == workspace_id)
            contact_query = contact_query.where(Contact.workspace_id == workspace_id)

        leads_result = await self.db.execute(lead_query)
        leads = leads_result.scalars().all()
        lead_emails_map = {lead.email.lower().strip(): lead for lead in leads if lead.email}

        contacts_result = await self.db.execute(contact_query)
        contacts = contacts_result.scalars().all()
        contact_emails_map = {c.email.lower().strip(): c for c in contacts if c.email}

        # 2. Gather outreach thread IDs, message IDs, and previously logged message IDs
        existing_interactions = await self.db.execute(
            select(SalesInteraction).where(
                SalesInteraction.interaction_type == InteractionType.EMAIL,
                SalesInteraction.user_id == current_user.id,
            )
        )
        interactions = existing_interactions.scalars().all()

        logged_gmail_message_ids: set[str] = set()
        known_outreach_threads: dict[str, dict[str, Any]] = {}
        known_outreach_message_ids: set[str] = set()
        leads_with_outreach: set[str] = set()
        outreach_subjects_by_lead: dict[str, list[str]] = {}

        # Load from integration.metadata_json["outreach_threads"]
        stored_threads = (integration.metadata_json or {}).get("outreach_threads") or {}
        for th_id, th_meta in stored_threads.items():
            if isinstance(th_meta, dict):
                known_outreach_threads[th_id] = th_meta
                if th_meta.get("initial_message_id"):
                    known_outreach_message_ids.add(th_meta["initial_message_id"])
                if th_meta.get("lead_email"):
                    em = th_meta["lead_email"].lower().strip()
                    leads_with_outreach.add(em)
                    if th_meta.get("subject"):
                        outreach_subjects_by_lead.setdefault(em, []).append(th_meta["subject"].lower().strip())

        for si in interactions:
            if not si.action_items:
                continue
            for item in si.action_items:
                if not isinstance(item, dict):
                    continue
                m_id = item.get("gmail_message_id")
                if m_id:
                    logged_gmail_message_ids.add(m_id)
                if item.get("type") == "gmail_email_sent":
                    th_id = item.get("gmail_thread_id")
                    to_addr = (item.get("to") or "").lower().strip()
                    subj = (item.get("subject") or "").lower().strip()
                    if m_id:
                        known_outreach_message_ids.add(m_id)
                    if th_id:
                        known_outreach_threads[th_id] = {
                            "lead_id": str(si.lead_id) if si.lead_id else item.get("lead_id"),
                            "contact_id": str(si.contact_id) if si.contact_id else item.get("contact_id"),
                            "lead_email": to_addr,
                            "subject": subj,
                        }
                    if to_addr:
                        leads_with_outreach.add(to_addr)
                        if subj:
                            outreach_subjects_by_lead.setdefault(to_addr, []).append(subj)

        if not lead_emails_map and not contact_emails_map and not known_outreach_threads:
            now = datetime.now(timezone.utc)
            integration.last_synced_at = now
            await self.db.commit()
            return GmailSyncResponse(
                success=True,
                synced_count=0,
                new_replies_count=0,
                last_synced_at=now,
                message="No CRM leads or outreach conversations found to synchronize.",
            )

        # 3. Build targeted Gmail search query for outreach threads & outreach leads
        query_parts = []
        if known_outreach_threads:
            thread_ids = list(known_outreach_threads.keys())[-20:]
            query_parts.append(f"({' OR '.join([f'thread:{tid}' for tid in thread_ids])})")

        active_target_emails = list(leads_with_outreach)
        for em in lead_emails_map.keys():
            if em not in active_target_emails:
                active_target_emails.append(em)
        for em in contact_emails_map.keys():
            if em not in active_target_emails:
                active_target_emails.append(em)

        if active_target_emails:
            query_parts.append(f"({' OR '.join([f'from:{em}' for em in active_target_emails[:20]])})")

        search_query = f"({' OR '.join(query_parts)})"

        # Exclude self-sent emails and automated system emails
        if integration.provider_email:
            search_query += f" -from:{integration.provider_email}"
        search_query += " -from:noreply -from:no-reply -from:notifications"

        # Date constraint
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

        for msg_summary in messages_list:
            msg_id = msg_summary.get("id")
            if not msg_id or msg_id in logged_gmail_message_ids:
                continue

            detail = await self.execute_with_token_retry(
                integration,
                lambda tok: self.client.get_message_detail(access_token=tok, message_id=msg_id),
            )
            if not detail:
                continue

            # 4. Strict Filtering: Reject system, auth, OTP, invitation emails
            if self.is_system_or_auth_email(detail, user_email=integration.provider_email):
                logger.debug("Skipping system/auth/OTP/invitation email id=%s subject=%s", msg_id, detail.get("subject"))
                continue

            clean_from = (detail.get("clean_from") or "").lower().strip()
            msg_thread_id = detail.get("gmail_thread_id")
            in_reply_to = (detail.get("in_reply_to") or "").strip()
            references = (detail.get("references") or "").strip()
            subject = (detail.get("subject") or "Reply from prospect").strip()
            subject_lower = subject.lower()

            # 5. Strict Relevance Matching:
            # Must belong to an outreach thread initiated by SalesGenie OR be a reply from the corresponding lead
            is_relevant = False
            matched_lead = None
            matched_contact = None
            thread_meta = None

            # Condition A: Belongs to a known outreach thread initiated by SalesGenie
            if msg_thread_id and msg_thread_id in known_outreach_threads:
                thread_meta = known_outreach_threads[msg_thread_id]
                thread_lead_email = (thread_meta.get("lead_email") or "").lower().strip()
                if clean_from == thread_lead_email or clean_from in lead_emails_map or clean_from in contact_emails_map:
                    is_relevant = True

            # Condition B: Direct RFC in-reply-to or references header matching a SalesGenie outreach message
            if not is_relevant and (in_reply_to or references):
                for sent_msg_id in known_outreach_message_ids:
                    if (in_reply_to and sent_msg_id in in_reply_to) or (references and sent_msg_id in references):
                        is_relevant = True
                        break

            # Condition C: Lead has prior outreach and message indicates a reply
            if not is_relevant and clean_from in leads_with_outreach:
                is_reply_subject = subject_lower.startswith(("re:", "re :", "fwd:", "aw:", "sv:"))
                known_subjs = outreach_subjects_by_lead.get(clean_from, [])
                matches_prior_subj = any(s in subject_lower for s in known_subjs if len(s) > 3)
                if is_reply_subject or matches_prior_subj:
                    is_relevant = True

            if not is_relevant:
                logger.debug("Skipping email id=%s from=%s subject=%s: Unrelated to SalesGenie outreach", msg_id, clean_from, subject)
                continue

            # Resolve CRM entities
            if thread_meta:
                t_lead_id = thread_meta.get("lead_id")
                t_contact_id = thread_meta.get("contact_id")
                if t_lead_id:
                    for l in leads:
                        if str(l.id) == str(t_lead_id):
                            matched_lead = l
                            break
                if t_contact_id:
                    for c in contacts:
                        if str(c.id) == str(t_contact_id):
                            matched_contact = c
                            break

            if not matched_lead and clean_from in lead_emails_map:
                matched_lead = lead_emails_map[clean_from]

            if not matched_contact and clean_from in contact_emails_map:
                matched_contact = contact_emails_map[clean_from]

            if not matched_lead and matched_contact and matched_contact.lead_id:
                for l in leads:
                    if l.id == matched_contact.lead_id:
                        matched_lead = l
                        break

            if not matched_lead and not matched_contact:
                logger.debug("Skipping message id=%s: No matching CRM lead or contact found", msg_id)
                continue

            # 6. Process Customer Reply
            synced_count += 1
            new_replies_count += 1
            body_text = detail.get("body_text", "")

            # AI analysis on reply using existing AI Provider
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

            action_items.append({
                "type": "gmail_customer_reply",
                "gmail_message_id": msg_id,
                "gmail_thread_id": msg_thread_id,
                "from": detail.get("from_address"),
                "clean_from": clean_from,
                "received_at": detail.get("date"),
                "snippet": detail.get("snippet"),
            })

            resolved_lead_id = matched_lead.id if matched_lead else None
            resolved_contact_id = matched_contact.id if matched_contact else None
            resolved_workspace_id = (
                matched_lead.workspace_id if matched_lead
                else (matched_contact.workspace_id if matched_contact else workspace_id)
            )

            # Insert SalesInteraction in CRM Activity timeline
            interaction = SalesInteraction(
                lead_id=resolved_lead_id,
                contact_id=resolved_contact_id,
                workspace_id=resolved_workspace_id,
                user_id=current_user.id,
                interaction_type=InteractionType.EMAIL,
                summary=ai_summary,
                action_items=action_items,
            )
            self.db.add(interaction)
            logged_gmail_message_ids.add(msg_id)

            # In-App Notification (strictly idempotent by gmail_message_id)
            contact_display_name = None
            company_display_name = None
            if matched_lead:
                contact_display_name = matched_lead.contact_name
                company_display_name = matched_lead.company_name
            elif matched_contact:
                contact_display_name = f"{matched_contact.first_name} {matched_contact.last_name or ''}".strip()

            try:
                await self.notification_service.notify_email_activity(
                    recipient_user_id=current_user.id,
                    workspace_id=resolved_workspace_id,
                    activity_type=NotificationType.EMAIL_REPLIED.value,
                    lead_id=resolved_lead_id,
                    contact_name=contact_display_name,
                    company_name=company_display_name,
                    subject=subject,
                    gmail_message_id=msg_id,
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
