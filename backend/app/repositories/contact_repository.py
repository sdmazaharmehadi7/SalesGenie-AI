"""Contact repository — data access for the `contacts` table."""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate


class ContactRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, contact_id: uuid.UUID) -> Contact | None:
        return await self.db.get(Contact, contact_id)

    async def create(self, contact_in: ContactCreate, owner_id: uuid.UUID | None) -> Contact:
        contact = Contact(
            first_name=contact_in.first_name,
            last_name=contact_in.last_name,
            email=contact_in.email,
            phone=contact_in.phone,
            job_title=contact_in.job_title,
            is_active=contact_in.is_active,
            account_id=contact_in.account_id,
            lead_id=contact_in.lead_id,
            owner_id=contact_in.owner_id if contact_in.owner_id is not None else owner_id,
        )
        self.db.add(contact)
        await self.db.flush()
        await self.db.refresh(contact)
        return contact

    async def update(self, contact: Contact, contact_in: ContactUpdate) -> Contact:
        update_data = contact_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(contact, field, value)
        await self.db.flush()
        await self.db.refresh(contact)
        return contact

    async def delete(self, contact: Contact) -> None:
        await self.db.delete(contact)
        await self.db.flush()

    async def list_contacts(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        owner_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        lead_id: uuid.UUID | None = None,
        search: str | None = None,
    ) -> tuple[list[Contact], int]:
        filters = []
        if owner_id is not None:
            filters.append(Contact.owner_id == owner_id)
        if account_id is not None:
            filters.append(Contact.account_id == account_id)
        if lead_id is not None:
            filters.append(Contact.lead_id == lead_id)
        if search:
            like_pattern = f"%{search}%"
            filters.append(
                or_(
                    Contact.first_name.ilike(like_pattern),
                    Contact.last_name.ilike(like_pattern),
                    Contact.email.ilike(like_pattern),
                    Contact.job_title.ilike(like_pattern),
                )
            )

        base_query = select(Contact)
        count_query = select(func.count()).select_from(Contact)
        for condition in filters:
            base_query = base_query.where(condition)
            count_query = count_query.where(condition)

        total = (await self.db.execute(count_query)).scalar_one()

        result = await self.db.execute(
            base_query.order_by(Contact.updated_at.desc()).offset(offset).limit(limit)
        )
        contacts = list(result.scalars().all())
        return contacts, total
