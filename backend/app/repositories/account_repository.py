"""Account repository — data access for the `accounts` table."""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate


class AccountRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, account_id: uuid.UUID) -> Account | None:
        return await self.db.get(Account, account_id)

    async def create(self, account_in: AccountCreate, owner_id: uuid.UUID | None) -> Account:
        account = Account(
            name=account_in.name,
            industry=account_in.industry,
            website=account_in.website,
            company_size=account_in.company_size,
            phone=account_in.phone,
            address=account_in.address,
            description=account_in.description,
            owner_id=account_in.owner_id if account_in.owner_id is not None else owner_id,
        )
        self.db.add(account)
        await self.db.flush()
        await self.db.refresh(account)
        return account

    async def update(self, account: Account, account_in: AccountUpdate) -> Account:
        update_data = account_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(account, field, value)
        await self.db.flush()
        await self.db.refresh(account)
        return account

    async def delete(self, account: Account) -> None:
        await self.db.delete(account)
        await self.db.flush()

    async def list_accounts(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        owner_id: uuid.UUID | None = None,
        search: str | None = None,
    ) -> tuple[list[Account], int]:
        filters = []
        if owner_id is not None:
            filters.append(Account.owner_id == owner_id)
        if search:
            like_pattern = f"%{search}%"
            filters.append(
                or_(
                    Account.name.ilike(like_pattern),
                    Account.industry.ilike(like_pattern),
                )
            )

        base_query = select(Account)
        count_query = select(func.count()).select_from(Account)
        for condition in filters:
            base_query = base_query.where(condition)
            count_query = count_query.where(condition)

        total = (await self.db.execute(count_query)).scalar_one()

        result = await self.db.execute(
            base_query.order_by(Account.updated_at.desc()).offset(offset).limit(limit)
        )
        accounts = list(result.scalars().all())
        return accounts, total
