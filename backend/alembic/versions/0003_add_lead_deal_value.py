"""add deal_value to leads

Revision ID: 0003_add_lead_deal_value
Revises: 0002_create_lead_pipeline_tables
Create Date: 2026-07-26 01:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_add_lead_deal_value"
down_revision: Union[str, None] = "0002_create_lead_pipeline_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("deal_value", sa.Numeric(precision=14, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column("leads", "deal_value")
