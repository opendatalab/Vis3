"""remove_name_in_bucket

Revision ID: 36abca001cd5
Revises: 
Create Date: 2025-06-10 15:18:38.084648

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '36abca001cd5'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    # 删除 bucket 表中的 name 列
    if 'bucket' in tables and 'name' in inspector.get_columns('bucket'):
        op.drop_column('bucket', 'name')
        op.execute("UPDATE bucket SET name = NULL")


def downgrade() -> None:
    """Downgrade schema."""
    pass
