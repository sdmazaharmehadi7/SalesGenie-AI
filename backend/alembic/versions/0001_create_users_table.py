"""create users table

Revision ID: 0001_create_users_table
Revises:
Create Date: 2026-07-25 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_create_users_table"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    userrole_enum = postgresql.ENUM(
        "admin",
        "sales_manager",
        "sales_rep",
        "bdr",
        "revops",
        name="userrole",
    )
    userrole_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "admin",
                "sales_manager",
                "sales_rep",
                "bdr",
                "revops",
                name="userrole",
                create_type=False,
            ),
            nullable=False,
            server_default="sales_rep",
        ),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    userrole_enum = postgresql.ENUM(
        "admin",
        "sales_manager",
        "sales_rep",
        "bdr",
        "revops",
        name="userrole",
    )
    userrole_enum.drop(op.get_bind(), checkfirst=True)
