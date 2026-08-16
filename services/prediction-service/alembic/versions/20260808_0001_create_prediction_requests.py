"""create prediction requests

Revision ID: 20260808_0001
Revises:
Create Date: 2026-08-08
"""
from alembic import op
import sqlalchemy as sa

revision = "20260808_0001"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table("prediction_requests", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("request_payload", sa.JSON(), nullable=False), sa.Column("predicted_price_crore", sa.Float(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))

def downgrade() -> None:
    op.drop_table("prediction_requests")
