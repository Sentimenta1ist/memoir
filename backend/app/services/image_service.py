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
MAX_LONG_SIDE = 1200
WEBP_QUALITY = 82
_BG = (9, 9, 15)  # #09090f


def _valid_magic(data: bytes) -> bool:
    h = data[:12]
    return (
        h[:3] == b"\xff\xd8\xff"
        or h[:8] == b"\x89PNG\r\n\x1a\n"
        or (h[:4] == b"RIFF" and h[8:12] == b"WEBP")
        or h[:6] in (b"GIF87a", b"GIF89a")
    )


def _compress(data: bytes) -> bytes:
    """Re-encode as WebP. Anything Pillow can't decode is rejected, never stored as-is."""
    try:
        img = Image.open(BytesIO(data))
        img = ImageOps.exif_transpose(img)

        if img.mode == "RGBA":
            bg = Image.new("RGB", img.size, _BG)
            bg.paste(img, mask=img.split()[3])
            img = bg
        else:
            img = img.convert("RGB")

        w, h = img.size
        if max(w, h) > MAX_LONG_SIDE:
            if w >= h:
                img = img.resize((MAX_LONG_SIDE, int(h * MAX_LONG_SIDE / w)), Image.LANCZOS)
            else:
                img = img.resize((int(w * MAX_LONG_SIDE / h), MAX_LONG_SIDE), Image.LANCZOS)

        buf = BytesIO()
        img.save(buf, format="WebP", quality=WEBP_QUALITY, method=4)
        return buf.getvalue()
    except Exception:
        logger.warning("Image compression failed, rejecting upload", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image format")


async def _read_limited(file: UploadFile) -> bytes:
    # Stop reading as soon as the limit is crossed instead of buffering the whole body
    data = await file.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 10MB)")
    return data


async def save_image(db: AsyncSession, entry_id: str, file: UploadFile) -> ImageModel:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files allowed")

    data = await _read_limited(file)

    if not _valid_magic(data):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image format")

    data = _compress(data)
    filename = f"{uuid.uuid4()}.webp"
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
