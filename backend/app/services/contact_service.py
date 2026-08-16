"""Contact service — business logic for CRM Contacts with multi-user data isolation."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.contact import Contact
from app.models.user import User, UserRole
from app.repositories.contact_repository import ContactRepository
from app.schemas.contact import ContactCreate, ContactUpdate

UNRESTRICTED_ROLES = {UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.REVOPS}


def _resolve_owner_id(current_user: User, requested_owner_id: uuid.UUID | None = None) -> uuid.UUID | None:
    if current_user.role in UNRESTRICTED_ROLES:
        return requested_owner_id
    return current_user.id


class ContactService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.contacts = ContactRepository(db)

    async def create_contact(self, contact_in: ContactCreate, current_user: User) -> Contact:
        owner_id = contact_in.owner_id if (current_user.role in UNRESTRICTED_ROLES and contact_in.owner_id) else current_user.id
        contact = await self.contacts.create(contact_in, owner_id=owner_id)
        await self.db.commit()
        return contact

    async def get_contact(self, contact_id: uuid.UUID, current_user: User) -> Contact:
        contact = await self.contacts.get_by_id(contact_id)
        if contact is None:
            raise NotFoundError("Contact not found.", error_code="contact_not_found")

        # Multi-user data isolation check
        if current_user.role not in UNRESTRICTED_ROLES and contact.owner_id != current_user.id:
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
        effective_owner = _resolve_owner_id(current_user, owner_id)
        return await self.contacts.list_contacts(
            offset=offset,
            limit=limit,
            owner_id=effective_owner,
            account_id=account_id,
            lead_id=lead_id,
            search=search,
        )
