"""
User ORM model.

Maps to the `Users` entity in the ER diagram (user_id, name, email, role,
department, created_at) plus the fields needed for authentication
(hashed_password, is_active) and the standard timestamp/PK mixins from
Module 1.
"""

import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class UserRole(str, enum.Enum):
    """
    Matches the "Users Layer" personas in the architecture diagram.
    Stored as a native Postgres enum (`userrole`) via SQLAlchemy's `Enum`.
    """

    ADMIN = "admin"
    SALES_MANAGER = "sales_manager"
    SALES_REP = "sales_rep"
    BDR = "bdr"  # Business Development Rep
    REVOPS = "revops"  # Revenue Operations


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    # role: Mapped[UserRole] = mapped_column(
    #     Enum(UserRole, name="userrole", native_enum=True),
    #     nullable=False,
    #     default=UserRole.SALES_REP,
    #     server_default=UserRole.SALES_REP.value,
    # )
    
    role: Mapped[UserRole] = mapped_column(
    Enum(
        UserRole,
        name="userrole",
        native_enum=True,
        values_callable=lambda enum: [e.value for e in enum],
    ),
    nullable=False,
    default=UserRole.SALES_REP,
    server_default=UserRole.SALES_REP.value,
    )
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role.value}>"
