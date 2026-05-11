import io
import uuid
from pathlib import Path

from fastapi import UploadFile, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.image import Image

MAX_SIZE = 10 * 1024 * 1024
MAX_LONG_SIDE = 1200
WEBP_QUALITY = 82
_BG = (9, 9, 15)  # #09090f


def _valid_magic(data: bytes) -> bool:
    h = data[:12]
    return (
        h[:3] == b"\xff\xd8\xff"
        or h[:8] == b"\x89PNG\r\n\x1a\n"
        or h[:4] == b"RIFF"
        or h[:6] in (b"GIF87a", b"GIF89a")
    )


def _compress(data: bytes) -> tuple[bytes, str]:
    try:
        from PIL import Image as PILImage, ImageOps

        img = PILImage.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)

        if img.mode == "RGBA":
            bg = PILImage.new("RGB", img.size, _BG)
            bg.paste(img, mask=img.split()[3])
            img = bg
        else:
            img = img.convert("RGB")

        w, h = img.size
        if max(w, h) > MAX_LONG_SIDE:
            if w >= h:
                img = img.resize((MAX_LONG_SIDE, int(h * MAX_LONG_SIDE / w)), PILImage.LANCZOS)
            else:
                img = img.resize((int(w * MAX_LONG_SIDE / h), MAX_LONG_SIDE), PILImage.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=WEBP_QUALITY)
        return buf.getvalue(), ".webp"
    except Exception:
        return data, None


async def save_image(db: AsyncSession, entry_id: str, file: UploadFile) -> Image:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files allowed")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 10MB)")

    if not _valid_magic(data):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image format")

    compressed, ext = _compress(data)
    if ext is None:
        ext = Path(file.filename).suffix if file.filename else ""
        compressed = data

    filename = f"{uuid.uuid4()}{ext}"
    dest = Path(settings.UPLOAD_DIR) / filename
    dest.write_bytes(compressed)

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
