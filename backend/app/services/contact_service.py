"""Contact service — business logic for CRM Contacts."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.contact import Contact
from app.models.user import User
from app.repositories.contact_repository import ContactRepository
from app.schemas.contact import ContactCreate, ContactUpdate


class ContactService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.contacts = ContactRepository(db)

    async def create_contact(self, contact_in: ContactCreate, current_user: User) -> Contact:
        contact = await self.contacts.create(contact_in, owner_id=contact_in.owner_id or current_user.id)
        await self.db.commit()
        return contact

    async def get_contact(self, contact_id: uuid.UUID, current_user: User) -> Contact:
        contact = await self.contacts.get_by_id(contact_id)
        if contact is None:
            raise NotFoundError("Contact not found.", error_code="contact_not_found")
        return contact

    async def update_contact(
        self, contact_id: uuid.UUID, contact_in: ContactUpdate, current_user: User
    ) -> Contact:
        contact = await self.get_contact(contact_id, current_user)
        updated = await self.contacts.update(contact, contact_in)
        await self.db.commit()
        return updated

    async def delete_contact(self, contact_id: uuid.UUID, current_user: User) -> None:
        contact = await self.get_contact(contact_id, current_user)
        await self.contacts.delete(contact)
        await self.db.commit()

    async def list_contacts(
        self,
        current_user: User,
        *,
        offset: int = 0,
        limit: int = 20,
        account_id: uuid.UUID | None = None,
        lead_id: uuid.UUID | None = None,
        search: str | None = None,
        owner_id: uuid.UUID | None = None,
    ) -> tuple[list[Contact], int]:
        return await self.contacts.list_contacts(
            offset=offset,
            limit=limit,
            owner_id=owner_id,
            account_id=account_id,
            lead_id=lead_id,
            search=search,
        )
