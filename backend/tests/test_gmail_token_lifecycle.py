# import uuid
# from datetime import datetime, timedelta, timezone
# from unittest.mock import AsyncMock, patch

# import pytest
# from app.db.session import AsyncSessionLocal
# from app.integrations.email.gmail_client import GmailTokenExpiredOrRevokedError
# from app.models.email_integration import EmailIntegration, EmailProviderType, IntegrationStatus
# from app.models.user import User
# from app.services.gmail_integration_service import GmailIntegrationService, _decrypt_token, _encrypt_token
# from sqlalchemy import select


# @pytest.mark.asyncio
# async def test_token_auto_refresh_when_expired():
#     """
#     Verify that an expired access token is automatically refreshed using the refresh token,
#     the new access token and updated expiry are saved to DB, and the existing refresh token
#     is preserved (not overwritten with None).
#     """
#     async with AsyncSessionLocal() as session:
#         user = (await session.execute(select(User).limit(1))).scalar_one_or_none()
#         if not user:
#             pytest.skip("No user found in DB")

#         # Clean up any existing test integration
#         existing = (await session.execute(
#             select(EmailIntegration).where(EmailIntegration.user_id == user.id)
#         )).scalar_one_or_none()
#         if existing:
#             await session.delete(existing)
#             await session.commit()

#         original_refresh_token = "1//mock-persistent-refresh-token-xyz"
#         expired_access_token = "ya29.old-expired-access-token"
#         fresh_access_token = "ya29.new-fresh-access-token"

#         past_expiry = datetime.now(timezone.utc) - timedelta(minutes=10)
#         integration = EmailIntegration(
#             user_id=user.id,
#             provider=EmailProviderType.GMAIL,
#             provider_email=user.email,
#             access_token_encrypted=_encrypt_token(expired_access_token),
#             refresh_token_encrypted=_encrypt_token(original_refresh_token),
#             token_expiry=past_expiry,
#             status=IntegrationStatus.CONNECTED,
#         )
#         session.add(integration)
#         await session.commit()
#         await session.refresh(integration)

#         svc = GmailIntegrationService(session)

#         # Mock Google OAuth token refresh response
#         mock_refresh_response = {
#             "access_token": fresh_access_token,
#             "expires_in": 3599,
#             "token_type": "Bearer",
#             "scope": "https://www.googleapis.com/auth/gmail.send",
#         }

#         with patch.object(svc.client, "refresh_access_token", new_callable=AsyncMock) as mock_refresh:
#             mock_refresh.return_value = mock_refresh_response

#             # Call get_valid_access_token
#             valid_token = await svc.get_valid_access_token(integration)

#             # 1. Returned token must be the fresh access token
#             assert valid_token == fresh_access_token
#             mock_refresh.assert_called_once_with(original_refresh_token)

#             # 2. In DB, access token must be updated and encrypted
#             await session.refresh(integration)
#             assert _decrypt_token(integration.access_token_encrypted) == fresh_access_token

#             # 3. In DB, existing refresh token must NOT be overwritten with None
#             assert _decrypt_token(integration.refresh_token_encrypted) == original_refresh_token

#             # 4. Token expiry must be in the future
#             assert integration.token_expiry > datetime.now(timezone.utc)
#             assert integration.status == IntegrationStatus.CONNECTED

#         # Clean up
#         await session.delete(integration)
#         await session.commit()


# @pytest.mark.asyncio
# async def test_execute_with_token_retry_on_401():
#     """
#     Verify that if an API call gets a 401 Unauthorized, execute_with_token_retry
#     automatically refreshes the token and retries the operation once successfully.
#     """
#     async with AsyncSessionLocal() as session:
#         user = (await session.execute(select(User).limit(1))).scalar_one_or_none()
#         if not user:
#             pytest.skip("No user found in DB")

#         original_refresh_token = "1//mock-refresh-token-401-test"
#         valid_access_token = "ya29.valid-looking-but-rejected-by-google"
#         fresh_access_token = "ya29.refreshed-working-token"

#         future_expiry = datetime.now(timezone.utc) + timedelta(minutes=45)
#         integration = EmailIntegration(
#             user_id=user.id,
#             provider=EmailProviderType.GMAIL,
#             provider_email=user.email,
#             access_token_encrypted=_encrypt_token(valid_access_token),
#             refresh_token_encrypted=_encrypt_token(original_refresh_token),
#             token_expiry=future_expiry,
#             status=IntegrationStatus.CONNECTED,
#         )
#         session.add(integration)
#         await session.commit()
#         await session.refresh(integration)

#         svc = GmailIntegrationService(session)

#         call_count = 0

#         async def mock_api_operation(token: str):
#             nonlocal call_count
#             call_count += 1
#             if token == valid_access_token:
#                 # First call: rejected with 401
#                 raise GmailTokenExpiredOrRevokedError("Google 401 Unauthorized")
#             return {"email": user.email, "messagesTotal": 42}

#         with patch.object(svc.client, "refresh_access_token", new_callable=AsyncMock) as mock_refresh:
#             mock_refresh.return_value = {
#                 "access_token": fresh_access_token,
#                 "expires_in": 3600,
#             }

#             result = await svc.execute_with_token_retry(integration, mock_api_operation)

#             assert call_count == 2
#             assert result["messagesTotal"] == 42
#             assert mock_refresh.call_count == 1
#             await session.refresh(integration)
#             assert _decrypt_token(integration.access_token_encrypted) == fresh_access_token

#         # Clean up
#         await session.delete(integration)
#         await session.commit()


# @pytest.mark.asyncio
# async def test_only_reconnect_when_refresh_token_itself_is_revoked():
#     """
#     Verify that reconnect is required ONLY when the refresh token itself is revoked/invalid.
#     """
#     async with AsyncSessionLocal() as session:
#         user = (await session.execute(select(User).limit(1))).scalar_one_or_none()
#         if not user:
#             pytest.skip("No user found in DB")

#         revoked_refresh_token = "1//revoked-refresh-token"
#         expired_access_token = "ya29.expired"

#         integration = EmailIntegration(
#             user_id=user.id,
#             provider=EmailProviderType.GMAIL,
#             provider_email=user.email,
#             access_token_encrypted=_encrypt_token(expired_access_token),
#             refresh_token_encrypted=_encrypt_token(revoked_refresh_token),
#             token_expiry=datetime.now(timezone.utc) - timedelta(minutes=10),
#             status=IntegrationStatus.CONNECTED,
#         )
#         session.add(integration)
#         await session.commit()
#         await session.refresh(integration)

#         svc = GmailIntegrationService(session)

#         with patch.object(svc.client, "refresh_access_token", new_callable=AsyncMock) as mock_refresh:
#             # Google returns invalid_grant on revoked refresh token
#             mock_refresh.side_effect = GmailTokenExpiredOrRevokedError("invalid_grant")

#             with pytest.raises(GmailTokenExpiredOrRevokedError):
#                 await svc.get_valid_access_token(integration)

#             await session.refresh(integration)
#             assert integration.status == IntegrationStatus.REVOKED
#             assert "revoked" in integration.last_error_message.lower()

#         # Clean up
#         await session.delete(integration)
#         await session.commit()
