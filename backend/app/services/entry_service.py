from datetime import date, datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entry import Entry
from app.schemas.entries import EntryCreate, EntryUpdate


async def get_entries(db: AsyncSession, user_id: str, page: int, limit: int):
    offset = (page - 1) * limit

    count_result = await db.execute(
        select(func.count()).select_from(Entry).where(Entry.user_id == user_id)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Entry)
        .where(Entry.user_id == user_id)
        .options(selectinload(Entry.images))
        .order_by(Entry.date.desc())
        .offset(offset)
        .limit(limit)
    )
    entries = list(result.scalars().all())

    streak = await calculate_streak(db, user_id)
    return entries, total, streak


async def calculate_streak(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(select(Entry.date).where(Entry.user_id == user_id))
    dates = set(result.scalars().all())

    if not dates:
        return 0

    today = date.today()
    current = today if today in dates else today - timedelta(days=1)
    streak = 0
    while current in dates:
        streak += 1
        current -= timedelta(days=1)
    return streak


async def get_entry_by_id(db: AsyncSession, entry_id: str, user_id: str) -> Entry | None:
    result = await db.execute(
        select(Entry)
        .where(Entry.id == entry_id, Entry.user_id == user_id)
        .options(selectinload(Entry.images))
    )
    return result.scalar_one_or_none()


async def get_today_entry(db: AsyncSession, user_id: str) -> Entry | None:
    result = await db.execute(
        select(Entry)
        .where(Entry.user_id == user_id, Entry.date == date.today())
        .options(selectinload(Entry.images))
    )
    return result.scalar_one_or_none()


async def create_entry(db: AsyncSession, user_id: str, data: EntryCreate) -> Entry:
    entry = Entry(
        user_id=user_id,
        date=data.date,
        day_text=data.day_text,
        thought_text=data.thought_text,
        tomorrow_text=data.tomorrow_text,
    )
    db.add(entry)
    await db.flush()
    result = await db.execute(
        select(Entry).where(Entry.id == entry.id).options(selectinload(Entry.images))
    )
    return result.scalar_one()


async def update_entry(db: AsyncSession, entry: Entry, data: EntryUpdate) -> Entry:
    # exclude_unset so optional sections can be cleared with an explicit null;
    # date and day_text are required columns and are never nulled
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is None and key in ("date", "day_text"):
            continue
        setattr(entry, key, value)
    entry.updated_at = datetime.utcnow()
    await db.flush()
    return entry


async def delete_entry(db: AsyncSession, entry: Entry) -> None:
    await db.delete(entry)
    await db.flush()
