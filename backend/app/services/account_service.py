"""Account service — business logic for CRM Accounts."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.account import Account
from app.models.user import User
from app.repositories.account_repository import AccountRepository
from app.schemas.account import AccountCreate, AccountUpdate


class AccountService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.accounts = AccountRepository(db)

    async def create_account(self, account_in: AccountCreate, current_user: User) -> Account:
        account = await self.accounts.create(account_in, owner_id=account_in.owner_id or current_user.id)
        await self.db.commit()
        return account

    async def get_account(self, account_id: uuid.UUID, current_user: User) -> Account:
        account = await self.accounts.get_by_id(account_id)
        if account is None:
            raise NotFoundError("Account not found.", error_code="account_not_found")
        return account

    async def update_account(
        self, account_id: uuid.UUID, account_in: AccountUpdate, current_user: User
    ) -> Account:
        account = await self.get_account(account_id, current_user)
        updated = await self.accounts.update(account, account_in)
        await self.db.commit()
        return updated

    async def delete_account(self, account_id: uuid.UUID, current_user: User) -> None:
        account = await self.get_account(account_id, current_user)
        await self.accounts.delete(account)
        await self.db.commit()

    async def list_accounts(
        self,
        current_user: User,
        *,
        offset: int = 0,
        limit: int = 20,
        search: str | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> tuple[list[Account], int]:
        return await self.accounts.list_accounts(
            offset=offset,
            limit=limit,
            owner_id=owner_id,
            search=search,
        )
