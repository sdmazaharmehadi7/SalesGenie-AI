"""
FastAPI endpoints for Gmail Email Integration.

Routes:
- GET  /integrations/gmail/auth-url    — Generate OAuth authorization URL
- POST /integrations/gmail/callback    — Exchange authorization code for tokens
- GET  /integrations/gmail/status      — Check current connection status
- POST /integrations/gmail/disconnect  — Disconnect Gmail integration (preserves history)
- POST /integrations/gmail/test        — Test active connection to Google API
- POST /integrations/gmail/send        — Send email via user's connected Gmail
- POST /integrations/gmail/sync        — Manually trigger relevant email sync & reply detection
- GET  /integrations/gmail/track/{id}  — 1x1 transparent tracking pixel endpoint
"""

import urllib.parse
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy import select

from app.api.deps import AIProviderDep, CurrentActiveUser, DBSession, WorkspaceContextDep
from app.core.config import settings
from app.core.logging import get_logger
from app.models.notification import NotificationType
from app.models.pipeline_enums import InteractionType
from app.models.sales_interaction import SalesInteraction
from app.models.user import User
from app.schemas.email_integration import (
    GmailAuthUrlResponse,
    GmailCallbackRequest,
    GmailSendRequest,
    GmailSendResponse,
    GmailStatusResponse,
    GmailSyncResponse,
    GmailTestResponse,
)
from app.services.gmail_integration_service import GmailIntegrationService
from app.services.notification_service import NotificationService

router = APIRouter()
logger = get_logger(__name__)

# Standard 1x1 transparent GIF bytes
TRANSPARENT_GIF_BYTES = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04"
    b"\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


@router.get(
    "/auth-url",
    response_model=GmailAuthUrlResponse,
    summary="Get Google OAuth 2.0 authorization URL",
)
async def get_auth_url(
    db: DBSession,
    current_user: CurrentActiveUser,
    redirect_uri: str | None = Query(None, description="Optional custom frontend callback URL"),
) -> GmailAuthUrlResponse:
    """Generate a CSRF-protected Google OAuth 2.0 authorization URL."""
    svc = GmailIntegrationService(db)
    res = svc.generate_auth_url(current_user, redirect_uri=redirect_uri)
    logger.info("Generated Gmail OAuth URL for user %s: %s", current_user.id, res.auth_url)
    return res


@router.get(
    "/callback",
    summary="Handle Google OAuth 2.0 direct browser redirect callback",
)
async def oauth_callback_get(
    db: DBSession,
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    error_description: str | None = Query(None),
) -> RedirectResponse:
    """
    Handle direct HTTP GET redirect from Google OAuth.
    Decodes the signed CSRF state JWT to identify the authenticated user,
    exchanges the authorization code for encrypted tokens, saves the integration,
    and redirects the browser back to the frontend settings page.
    """
    frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:5173") or "http://localhost:5173"
    frontend_url = f"{frontend_base.rstrip('/')}/settings/email"

    if error:
        logger.warning("Google OAuth error: %s (description: %s)", error, error_description)
        msg = urllib.parse.quote(error_description or error or "OAuth authorization was denied.")
        return RedirectResponse(url=f"{frontend_url}?status=error&message={msg}", status_code=302)

    if not code or not state:
        msg = urllib.parse.quote("Missing code or state parameter from Google.")
        return RedirectResponse(url=f"{frontend_url}?status=error&message={msg}", status_code=302)

    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=["HS256"])
        user_id_str = payload.get("sub")
        if not user_id_str or payload.get("purpose") != "gmail_oauth":
            msg = urllib.parse.quote("Invalid or forged OAuth state parameter.")
            return RedirectResponse(url=f"{frontend_url}?status=error&message={msg}", status_code=302)

        user_id = uuid.UUID(user_id_str)
        user = await db.get(User, user_id)
        if not user or not user.is_active:
            msg = urllib.parse.quote("User not found or inactive.")
            return RedirectResponse(url=f"{frontend_url}?status=error&message={msg}", status_code=302)

        svc = GmailIntegrationService(db)
        await svc.handle_oauth_callback(
            current_user=user,
            code=code,
            state=state,
            redirect_uri=settings.GOOGLE_REDIRECT_URI,
        )
        return RedirectResponse(url=f"{frontend_url}?status=connected", status_code=302)
    except Exception as exc:
        logger.exception("Error processing Google OAuth GET callback: %s", exc)
        msg = urllib.parse.quote(str(exc))
        return RedirectResponse(url=f"{frontend_url}?status=error&message={msg}", status_code=302)


@router.post(
    "/callback",
    response_model=GmailStatusResponse,
    summary="Handle Google OAuth 2.0 callback",
)
async def oauth_callback(
    payload: GmailCallbackRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> GmailStatusResponse:
    """Exchange OAuth authorization code for encrypted tokens and store integration."""
    svc = GmailIntegrationService(db)
    return await svc.handle_oauth_callback(
        current_user=current_user,
        code=payload.code,
        state=payload.state,
        redirect_uri=payload.redirect_uri or settings.GOOGLE_REDIRECT_URI,
    )


@router.get(
    "/status",
    response_model=GmailStatusResponse,
    summary="Get Gmail integration connection status",
)
async def get_status(
    db: DBSession,
    current_user: CurrentActiveUser,
) -> GmailStatusResponse:
    """Return sanitized connection status for the current user."""
    svc = GmailIntegrationService(db)
    return await svc.get_status(current_user)


@router.post(
    "/disconnect",
    response_model=GmailStatusResponse,
    summary="Disconnect Gmail integration",
)
async def disconnect(
    db: DBSession,
    current_user: CurrentActiveUser,
) -> GmailStatusResponse:
    """Revoke tokens at Google, clear stored credentials, and mark disconnected."""
    svc = GmailIntegrationService(db)
    return await svc.disconnect(current_user)


@router.post(
    "/test",
    response_model=GmailTestResponse,
    summary="Test Gmail connection",
)
async def test_connection(
    db: DBSession,
    current_user: CurrentActiveUser,
) -> GmailTestResponse:
    """Verify stored tokens and check connectivity to Google APIs."""
    svc = GmailIntegrationService(db)
    return await svc.test_connection(current_user)


@router.post(
    "/send",
    response_model=GmailSendResponse,
    summary="Send an email via user's connected Gmail account",
)
async def send_email(
    payload: GmailSendRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> GmailSendResponse:
    """Send an email from rep's connected Gmail address and log CRM SalesInteraction."""
    svc = GmailIntegrationService(db)
    return await svc.send_email(current_user, payload, ws_ctx=ws_ctx)


@router.post(
    "/sync",
    response_model=GmailSyncResponse,
    summary="Trigger relevant email synchronization & reply detection",
)
async def sync_emails(
    db: DBSession,
    current_user: CurrentActiveUser,
    ai_provider: AIProviderDep,
    ws_ctx: WorkspaceContextDep,
) -> GmailSyncResponse:
    """Scan Gmail for CRM lead messages, detect replies, invoke AI summarization, and notify user."""
    svc = GmailIntegrationService(db, ai_provider=ai_provider)
    return await svc.sync_relevant_emails(current_user, ws_ctx=ws_ctx)


@router.get(
    "/track/{tracking_id}",
    summary="Transparent 1x1 GIF tracking pixel for email open detection",
)
async def track_email_open(
    tracking_id: str,
    db: DBSession,
) -> Response:
    """
    Transparent 1x1 GIF endpoint. Records real open events and dispatches in-app notification.
    Does not track unless tracking_id matches an actual sent email.
    """
    try:
        # Search for interaction with matching tracking_id in action_items
        result = await db.execute(
            select(SalesInteraction).where(
                SalesInteraction.interaction_type == InteractionType.EMAIL,
            )
        )
        interactions = result.scalars().all()
        for interaction in interactions:
            if interaction.action_items:
                for item in interaction.action_items:
                    if isinstance(item, dict) and item.get("tracking_id") == tracking_id:
                        if not item.get("opened_at"):
                            item["opened_at"] = datetime.now(timezone.utc).isoformat()
                            interaction.action_items = list(interaction.action_items)
                            await db.commit()

                            # Dispatch email opened notification
                            if interaction.user_id:
                                notif_svc = NotificationService(db)
                                await notif_svc.notify_email_activity(
                                    recipient_user_id=interaction.user_id,
                                    workspace_id=interaction.workspace_id,
                                    activity_type=NotificationType.EMAIL_OPENED.value,
                                    lead_id=interaction.lead_id,
                                    subject=interaction.summary.replace("✉️ Email Sent: ", "") if interaction.summary else "Outreach",
                                )
                        break
    except Exception as exc:
        logger.warning("Tracking pixel processing error: %s", exc)

    return Response(content=TRANSPARENT_GIF_BYTES, media_type="image/gif")
