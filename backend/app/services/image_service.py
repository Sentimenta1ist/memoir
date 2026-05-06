import uuid
from pathlib import Path

from fastapi import UploadFile, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.image import Image

MAX_SIZE = 10 * 1024 * 1024


async def save_image(db: AsyncSession, entry_id: str, file: UploadFile) -> Image:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files allowed")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 10MB)")

    suffix = Path(file.filename).suffix if file.filename else ""
    filename = f"{uuid.uuid4()}{suffix}"
    dest = Path(settings.UPLOAD_DIR) / filename
    dest.write_bytes(data)

    count_result = await db.execute(
        select(func.count()).select_from(Image).where(Image.entry_id == entry_id)
    )
    position = count_result.scalar() or 0

    image = Image(entry_id=entry_id, filename=filename, url=f"/static/{filename}", position=position)
    db.add(image)
    await db.flush()
    return image


async def delete_image(db: AsyncSession, image: Image) -> None:
    path = Path(settings.UPLOAD_DIR) / image.filename
    try:
        path.unlink()
    except FileNotFoundError:
        pass
    await db.delete(image)
    await db.flush()
