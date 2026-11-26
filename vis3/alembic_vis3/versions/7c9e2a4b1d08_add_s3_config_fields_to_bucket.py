"""add_s3_config_fields_to_bucket

Revision ID: 7c9e2a4b1d08
Revises: 36abca001cd5
Create Date: 2026-11-26 17:35:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7c9e2a4b1d08"
down_revision: Union[str, None] = "36abca001cd5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add S3 compatibility configuration columns to bucket table idempotently."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "bucket" not in inspector.get_table_names():
        return

    existing_cols = {col["name"] for col in inspector.get_columns("bucket")}

    if "addressing_style" not in existing_cols:
        op.add_column(
            "bucket",
            sa.Column(
                "addressing_style",
                sa.String(length=32),
                nullable=False,
                server_default="auto",
            ),
        )
    if "region" not in existing_cols:
        op.add_column(
            "bucket",
            sa.Column(
                "region",
                sa.String(length=64),
                nullable=True,
                server_default="us-east-1",
            ),
        )
    if "signature_version" not in existing_cols:
        op.add_column(
            "bucket",
            sa.Column(
                "signature_version",
                sa.String(length=32),
                nullable=False,
                server_default="s3v4",
            ),
        )
    if "verify_ssl" not in existing_cols:
        op.add_column(
            "bucket",
            sa.Column(
                "verify_ssl",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("1"),
            ),
        )


def downgrade() -> None:
    """Drop added S3 compatibility configuration columns."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "bucket" not in inspector.get_table_names():
        return

    existing_cols = {col["name"] for col in inspector.get_columns("bucket")}
    for col_name in ("verify_ssl", "signature_version", "region", "addressing_style"):
        if col_name in existing_cols:
            op.drop_column("bucket", col_name)
