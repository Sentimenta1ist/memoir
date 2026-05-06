from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.image import Image
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.entries import ImageResponse
from app.services import entry_service, image_service

router = APIRouter(tags=["images"])


@router.post("/entries/{entry_id}/images", response_model=ImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    entry_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await entry_service.get_entry_by_id(db, entry_id, current_user.id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    image = await image_service.save_image(db, entry_id, file)
    await db.commit()
    return image


@router.delete("/entries/{entry_id}/images/{img_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    entry_id: str,
    img_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await entry_service.get_entry_by_id(db, entry_id, current_user.id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    result = await db.execute(
        select(Image).where(Image.id == img_id, Image.entry_id == entry_id)
    )
    image = result.scalar_one_or_none()
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    await image_service.delete_image(db, image)
    db.expire(entry)
    await db.commit()
