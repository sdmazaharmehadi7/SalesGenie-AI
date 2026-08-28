import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal, engine
from app.models.email_otp import EmailOTP
from app.models.user import User


@pytest.fixture(autouse=True)
async def cleanup_db_engine():
    yield
    # Dispose connection pool so connections aren't tied to closed event loops
    await engine.dispose()


async def register_and_verify_user(
    client: AsyncClient,
    name: str,
    email: str,
    password: str = "SecurePassword123!",
    role: str = "sales_rep",
) -> str:
    """Helper to register a user, retrieve their OTP, verify it, and return the access token."""
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": password, "role": role},
    )
    assert reg_res.status_code == 201, reg_res.text

    async with AsyncSessionLocal() as db:
        user_stmt = select(User).where(User.email == email)
        user = (await db.execute(user_stmt)).scalar_one()
        otp_stmt = select(EmailOTP).where(EmailOTP.user_id == user.id, EmailOTP.is_used == False)
        otp = (await db.execute(otp_stmt)).scalars().first()
        code = otp.otp_code

    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": email, "otp": code},
    )
    assert verify_res.status_code == 200, verify_res.text
    return verify_res.json()["access_token"]
