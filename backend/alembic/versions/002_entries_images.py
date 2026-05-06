"""entries_images

Revision ID: 002_entries_images
Revises: 441fa6562f08
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '002_entries_images'
down_revision: Union[str, Sequence[str], None] = '441fa6562f08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # entries and images tables were created in the initial migration
    pass


def downgrade() -> None:
    pass
