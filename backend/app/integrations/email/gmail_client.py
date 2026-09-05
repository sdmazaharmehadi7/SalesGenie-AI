"""
GmailClient — Production-ready client for Google OAuth 2.0 and Gmail REST API (v1).

Handles:
- OAuth Authorization URL generation with required least-privilege scopes
- Authorization code exchange for Access & Refresh Tokens
- Automatic token refresh
- Account profile retrieval (email address)
- Token revocation
- Sending plain-text and HTML emails via Gmail REST API
- Querying and retrieving email messages / threads matching CRM contacts
- Robust error handling (rate limits, expired tokens, network timeouts)
"""

import base64
import email
from email.message import EmailMessage
from typing import Any
import urllib.parse

import httpx

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import get_logger

logger = get_logger(__name__)

# Required Google OAuth Scopes
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
]

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


class GmailAPIError(AppException):
    status_code = 502
    error_code = "gmail_api_error"

    def __init__(self, message: str, status_code: int = 502, error_code: str = "gmail_api_error") -> None:
        self.status_code = status_code
        super().__init__(message=message, error_code=error_code)


class GmailTokenExpiredOrRevokedError(GmailAPIError):
    status_code = 401
    error_code = "gmail_token_revoked"

    def __init__(self, message: str = "Gmail access token is expired or revoked. Please reconnect.") -> None:
        super().__init__(message=message, status_code=401, error_code="gmail_token_revoked")


def _extract_google_error(resp: httpx.Response, fallback_msg: str) -> str:
    """Extract clear, actionable error message from Google API error payload."""
    try:
        data = resp.json()
        if isinstance(data, dict) and "error" in data:
            err = data["error"]
            msg = str(err.get("message") or "") if isinstance(err, dict) else str(err or "")
            if "has not been used in project" in msg or "is disabled" in msg or "SERVICE_DISABLED" in resp.text:
                return (
                    "Gmail API is disabled in your Google Cloud Project. "
                    "Please visit https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=687323326976 "
                    "and click 'ENABLE', then wait 1-2 minutes and retry."
                )
            if msg:
                return msg
    except Exception:
        pass
    return fallback_msg


class GmailClient:
    def __init__(
        self,
        client_id: str | None = None,
        client_secret: str | None = None,
        redirect_uri: str | None = None,
    ) -> None:
        self.client_id = client_id or settings.GOOGLE_CLIENT_ID
        self.client_secret = client_secret or settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI

    # -------------------------------------------------------------------------
    # 1. OAuth Flows
    # -------------------------------------------------------------------------

    def get_authorization_url(self, state: str, redirect_uri: str | None = None) -> str:
        """
        Build Google OAuth 2.0 authorization URL.
        Includes offline access to receive a refresh token and prompts consent.
        """
        if not self.client_id:
            raise GmailAPIError(
                "GOOGLE_CLIENT_ID is not configured in backend environment.",
                status_code=500,
                error_code="gmail_config_missing",
            )

        cb_uri = redirect_uri or self.redirect_uri
        params = {
            "client_id": self.client_id,
            "redirect_uri": cb_uri,
            "response_type": "code",
            "scope": " ".join(GMAIL_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
            "include_granted_scopes": "true",
        }
        return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

    async def exchange_code(
        self, code: str, redirect_uri: str | None = None
    ) -> dict[str, Any]:
        """
        Exchange authorization code with Google's token endpoint.
        Returns dict with: access_token, refresh_token, expires_in, scope, token_type.
        """
        if not self.client_id or not self.client_secret:
            raise GmailAPIError(
                "Google OAuth credentials (client_id / client_secret) are not configured.",
                status_code=500,
                error_code="gmail_config_missing",
            )

        cb_uri = redirect_uri or self.redirect_uri
        data = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": cb_uri,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(GOOGLE_TOKEN_URL, data=data)
            if resp.is_error:
                logger.error("Google OAuth token exchange failed: %s", resp.text)
                raise GmailAPIError(
                    f"Google OAuth token exchange failed: {resp.text}",
                    status_code=resp.status_code,
                    error_code="gmail_oauth_failed",
                )
            return resp.json()

    async def refresh_access_token(self, refresh_token: str) -> dict[str, Any]:
        """
        Exchange refresh token for a fresh access token.
        Returns dict with: access_token, expires_in, token_type, and possibly new refresh_token.
        """
        if not self.client_id or not self.client_secret:
            raise GmailAPIError(
                "Google OAuth credentials missing for token refresh.",
                status_code=500,
                error_code="gmail_config_missing",
            )

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(GOOGLE_TOKEN_URL, data=data)
            if resp.status_code in (400, 401):
                err_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                err_desc = err_data.get("error_description", resp.text)
                if "invalid_grant" in resp.text or "revoked" in resp.text:
                    raise GmailTokenExpiredOrRevokedError(f"Gmail access revoked or expired: {err_desc}")
                raise GmailAPIError(f"Token refresh failed: {err_desc}", status_code=resp.status_code)
            elif resp.is_error:
                raise GmailAPIError(f"Token refresh error: {resp.text}", status_code=resp.status_code)

            return resp.json()

    async def get_user_profile(self, access_token: str) -> dict[str, Any]:
        """
        Fetch the verified email address and profile of the connected Google account.
        Tries Gmail API /profile first, with clean fallback to oauth2 /userinfo.
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Fetch from Gmail profile endpoint
            try:
                resp = await client.get(f"{GMAIL_API_BASE}/profile", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "email": data.get("emailAddress"),
                        "messages_total": data.get("messagesTotal"),
                        "threads_total": data.get("threadsTotal"),
                        "history_id": data.get("historyId"),
                    }
                elif resp.status_code == 401:
                    raise GmailTokenExpiredOrRevokedError("Gmail access token expired.")
                else:
                    logger.debug("Gmail /profile returned status %s: %s", resp.status_code, resp.text)
            except GmailTokenExpiredOrRevokedError:
                raise
            except Exception as e:
                logger.debug("Gmail /profile endpoint request failed: %s", e)

            # 2. Fallback to oauth2 userinfo
            userinfo_resp = await client.get(GOOGLE_USERINFO_URL, headers=headers)
            if userinfo_resp.status_code == 200:
                u_data = userinfo_resp.json()
                return {"email": u_data.get("email")}
            elif userinfo_resp.status_code == 401:
                raise GmailTokenExpiredOrRevokedError("Gmail access token expired.")

            raise GmailAPIError(f"Failed to fetch Google profile: {userinfo_resp.text}", status_code=userinfo_resp.status_code)

    async def revoke_token(self, token: str) -> bool:
        """
        Revoke an access or refresh token via Google's revocation endpoint.
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(GOOGLE_REVOKE_URL, params={"token": token})
                return resp.status_code == 200
        except Exception as exc:
            logger.warning("Token revocation request failed (ignorable): %s", exc)
            return False

    # -------------------------------------------------------------------------
    # 2. Sending Emails via Gmail REST API
    # -------------------------------------------------------------------------

    async def send_email(
        self,
        *,
        access_token: str,
        from_email: str,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
        from_name: str | None = None,
        in_reply_to: str | None = None,
        references: str | None = None,
        thread_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Send an email via Gmail REST API messages.send endpoint.
        Returns: {"id": message_id, "threadId": thread_id, "labelIds": [...]}
        """
        msg = EmailMessage()
        msg["To"] = to_email
        from_header = f"{from_name} <{from_email}>" if from_name else from_email
        msg["From"] = from_header
        msg["Subject"] = subject

        if in_reply_to:
            msg["In-Reply-To"] = in_reply_to
        if references:
            msg["References"] = references

        if body_html:
            msg.set_content(body_text)
            msg.add_alternative(body_html, subtype="html")
        else:
            msg.set_content(body_text)

        raw_bytes = msg.as_bytes()
        raw_b64 = base64.urlsafe_b64encode(raw_bytes).decode("ascii")

        payload: dict[str, Any] = {"raw": raw_b64}
        if thread_id:
            payload["threadId"] = thread_id

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{GMAIL_API_BASE}/messages/send",
                headers=headers,
                json=payload,
            )

            if resp.status_code == 401:
                raise GmailTokenExpiredOrRevokedError("Gmail access token expired.")
            elif resp.is_error:
                err_msg = _extract_google_error(resp, f"Gmail delivery failed: {resp.text}")
                logger.error("Gmail messages.send failed: %s", err_msg)
                raise GmailAPIError(err_msg, status_code=resp.status_code)

            return resp.json()

    # -------------------------------------------------------------------------
    # 3. Controlled & Relevant Email Syncing (No Full Mailbox Ingestion)
    # -------------------------------------------------------------------------

    async def query_messages(
        self,
        *,
        access_token: str,
        query: str,
        max_results: int = 25,
    ) -> list[dict[str, Any]]:
        """
        Search for messages in Gmail matching a specific query (e.g. from:lead@domain.com).
        Returns list of summary items: [{"id": "...", "threadId": "..."}, ...]
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {"q": query, "maxResults": min(max_results, 50)}

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GMAIL_API_BASE}/messages",
                headers=headers,
                params=params,
            )

            if resp.status_code == 401:
                raise GmailTokenExpiredOrRevokedError("Gmail access token expired.")
            elif resp.status_code == 403:
                err_msg = _extract_google_error(resp, f"Gmail query forbidden: {resp.text}")
                logger.warning("Gmail messages list forbidden: %s", err_msg)
                raise GmailAPIError(err_msg, status_code=resp.status_code)
            elif resp.is_error:
                logger.warning("Gmail messages list query failed: %s", resp.text)
                return []

            data = resp.json()
            return data.get("messages", [])

    async def get_message_detail(
        self,
        *,
        access_token: str,
        message_id: str,
    ) -> dict[str, Any] | None:
        """
        Fetch full parsed details for a single message.
        Extracts headers (From, To, Subject, Date, Message-ID), snippet, and body.
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {"format": "full"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GMAIL_API_BASE}/messages/{message_id}",
                headers=headers,
                params=params,
            )

            if resp.status_code == 401:
                raise GmailTokenExpiredOrRevokedError("Gmail access token expired.")
            elif resp.status_code == 404:
                return None
            elif resp.status_code == 403:
                logger.warning("Gmail message %s fetch forbidden: %s", message_id, resp.text)
                return None
            elif resp.is_error:
                logger.warning("Gmail message %s fetch failed: %s", message_id, resp.text)
                return None

            data = resp.json()
            return self._parse_message_data(data)

    def _parse_message_data(self, data: dict[str, Any]) -> dict[str, Any]:
        """Extract structured fields from Gmail raw payload."""
        msg_id = data.get("id")
        thread_id = data.get("threadId")
        snippet = data.get("snippet", "")
        internal_date = data.get("internalDate")
        label_ids = data.get("labelIds", [])

        payload = data.get("payload", {})
        headers_list = payload.get("headers", [])
        headers_map: dict[str, str] = {}
        for h in headers_list:
            headers_map[h.get("name", "").lower()] = h.get("value", "")

        from_header = headers_map.get("from", "")
        to_header = headers_map.get("to", "")
        subject_header = headers_map.get("subject", "")
        date_header = headers_map.get("date", "")
        message_id_header = headers_map.get("message-id", "")
        in_reply_to_header = headers_map.get("in-reply-to", "")

        # Extract plain body text
        body_text = self._extract_body(payload) or snippet

        return {
            "gmail_message_id": msg_id,
            "gmail_thread_id": thread_id,
            "snippet": snippet,
            "internal_date": internal_date,
            "label_ids": label_ids,
            "from_address": from_header,
            "to_address": to_header,
            "subject": subject_header,
            "date": date_header,
            "rfc_message_id": message_id_header,
            "in_reply_to": in_reply_to_header,
            "body_text": body_text[:4000] if body_text else "",  # Cap at reasonable length
        }

    def _extract_body(self, payload: dict[str, Any]) -> str:
        """Recursively decode text/plain body from payload parts."""
        mime_type = payload.get("mimeType", "")
        body_data = payload.get("body", {}).get("data")

        if mime_type == "text/plain" and body_data:
            try:
                return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")
            except Exception:
                pass

        parts = payload.get("parts", [])
        for part in parts:
            extracted = self._extract_body(part)
            if extracted:
                return extracted

        return ""
