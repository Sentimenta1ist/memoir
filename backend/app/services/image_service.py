import logging
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile, HTTPException, status
from PIL import Image, ImageOps
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.image import Image as ImageModel

logger = logging.getLogger(__name__)

MAX_SIZE = 10 * 1024 * 1024


def _compress(data: bytes, original_suffix: str) -> tuple[bytes, str]:
    try:
        img = Image.open(BytesIO(data))
        img = ImageOps.exif_transpose(img)
        if max(img.width, img.height) > 1600:
            img.thumbnail((1600, 1600), Image.LANCZOS)
        if img.mode == "RGBA":
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        else:
            img = img.convert("RGB")
        buf = BytesIO()
        img.save(buf, format="WebP", quality=82, method=4)
        return (buf.getvalue(), ".webp")
    except Exception:
        logger.warning("Image compression failed, using original", exc_info=True)
        return (data, original_suffix)


async def save_image(db: AsyncSession, entry_id: str, file: UploadFile) -> ImageModel:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files allowed")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 10MB)")

    original_suffix = Path(file.filename).suffix if file.filename else ""
    data, suffix = _compress(data, original_suffix)
    filename = f"{uuid.uuid4()}{suffix}"
    dest = Path(settings.UPLOAD_DIR) / filename
    dest.write_bytes(data)

    count_result = await db.execute(
        select(func.count()).select_from(ImageModel).where(ImageModel.entry_id == entry_id)
    )
    position = count_result.scalar() or 0

    image = ImageModel(entry_id=entry_id, filename=filename, url=f"/static/{filename}", position=position)
    db.add(image)
    await db.flush()
    return image


async def delete_image(db: AsyncSession, image: ImageModel) -> None:
    path = Path(settings.UPLOAD_DIR) / image.filename
    try:
        path.unlink()
    except FileNotFoundError:
        pass
    await db.delete(image)
    await db.flush()
