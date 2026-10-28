from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.entries import EntryCreate, EntryUpdate, EntryResponse, EntryListResponse
from app.services import entry_service

router = APIRouter(prefix="/entries", tags=["entries"])


@router.get("", response_model=EntryListResponse)
async def list_entries(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries, total, streak = await entry_service.get_entries(db, current_user.id, page, limit)
    return EntryListResponse(items=entries, total=total, streak=streak)


@router.post("", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    body: EntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        entry = await entry_service.create_entry(db, current_user.id, body)
        await db.commit()
        return entry
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry for this date already exists")


@router.get("/today", response_model=EntryResponse | None)
async def get_today(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await entry_service.get_today_entry(db, current_user.id)


@router.get("/{entry_id}", response_model=EntryResponse)
async def get_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await entry_service.get_entry_by_id(db, entry_id, current_user.id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry


@router.put("/{entry_id}", response_model=EntryResponse)
async def update_entry(
    entry_id: str,
    body: EntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await entry_service.get_entry_by_id(db, entry_id, current_user.id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    try:
        entry = await entry_service.update_entry(db, entry, body)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry for this date already exists")
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await entry_service.get_entry_by_id(db, entry_id, current_user.id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    await entry_service.delete_entry(db, entry)
    await db.commit()
