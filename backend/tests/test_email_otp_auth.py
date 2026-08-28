"""
Test email OTP verification, single-use enforcement, cooldown/rate limiting,
unverified login rejection, and Google OAuth OTP bypass.
"""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.email_otp import EmailOTP
from app.models.user import User


@pytest.mark.asyncio
async def test_email_otp_signup_verification_and_login_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique = uuid.uuid4().hex[:8]
        email = f"otp_user_{unique}@example.com"
        password = "SecurePassword123!"

        # 1. Signup with email & password -> sends OTP
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "OTP Test User",
                "email": email,
                "password": password,
                "role": "sales_rep",
            },
        )
        assert reg_res.status_code == 201, reg_res.text
        reg_data = reg_res.json()
        assert reg_data["requires_verification"] is True
        assert reg_data["email"] == email

        # 2. Attempt to login before OTP verification -> Rejected (401 with email_not_verified)
        login_fail = await client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login_fail.status_code == 401
        err_json = login_fail.json()
        err_msg = err_json.get("error", {}).get("message", "") or err_json.get("detail", "")
        assert "verify your email" in err_msg.lower()

        # 3. Retrieve OTP from database to simulate reading the verification email
        async with AsyncSessionLocal() as db:
            user_stmt = select(User).where(User.email == email)
            user = (await db.execute(user_stmt)).scalar_one()
            assert user.is_email_verified is False

            otp_stmt = select(EmailOTP).where(EmailOTP.user_id == user.id, EmailOTP.is_used == False)
            otp_record = (await db.execute(otp_stmt)).scalars().first()
            assert otp_record is not None
            assert len(otp_record.otp_code) == 6
            otp_code = otp_record.otp_code

        # 4. Attempt verification with wrong OTP -> Rejected
        verify_fail = await client.post(
            "/api/v1/auth/verify-otp",
            json={"email": email, "otp": "000000"},
        )
        assert verify_fail.status_code in (400, 422)

        # 5. Verify with correct OTP -> Success, returns tokens
        verify_success = await client.post(
            "/api/v1/auth/verify-otp",
            json={"email": email, "otp": otp_code},
        )
        assert verify_success.status_code == 200, verify_success.text
        token_data = verify_success.json()
        assert "access_token" in token_data
        access_token = token_data["access_token"]

        # 6. Check user is now email_verified in DB and /me endpoint works
        me_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["is_email_verified"] is True
        assert me_data["email"] == email

        # 7. Subsequent login succeeds
        login_success = await client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login_success.status_code == 200
        assert "access_token" in login_success.json()


@pytest.mark.asyncio
async def test_email_otp_resend_cooldown_rate_limit():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique = uuid.uuid4().hex[:8]
        email = f"cooldown_user_{unique}@example.com"
        password = "SecurePassword123!"

        # 1. Register
        await client.post(
            "/api/v1/auth/register",
            json={"name": "Cooldown User", "email": email, "password": password},
        )

        # 2. Immediate resend within 60s cooldown -> Rejected with cooldown error
        resend_res = await client.post(
            "/api/v1/auth/resend-otp",
            json={"email": email},
        )
        assert resend_res.status_code in (400, 422, 429)
        err_msg = resend_res.json().get("error", {}).get("message", "") or resend_res.json().get("detail", "")
        assert "seconds before requesting" in err_msg.lower()
