from io import BytesIO

import pytest
from fastapi import HTTPException
from PIL import Image

from app.services.image_service import _compress


def make_jpeg(width: int, height: int) -> bytes:
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def make_png_rgba(width: int, height: int) -> bytes:
    img = Image.new("RGBA", (width, height), color=(100, 150, 200, 128))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_jpeg_with_exif_orientation(width: int, height: int, orientation: int) -> bytes:
    img = Image.new("RGB", (width, height), color=(200, 100, 50))
    exif = img.getexif()
    exif[0x0112] = orientation
    buf = BytesIO()
    img.save(buf, format="JPEG", exif=exif.tobytes())
    return buf.getvalue()


def test_compress_jpeg_returns_webp():
    data = make_jpeg(2000, 1500)
    result = _compress(data)
    assert Image.open(BytesIO(result)).format == "WEBP"
    out = Image.open(BytesIO(result))
    w, h = out.size
    assert w <= 1600 and h <= 1600


def test_compress_small_image_no_resize():
    data = make_jpeg(800, 600)
    result = _compress(data)
    assert Image.open(BytesIO(result)).format == "WEBP"
    out = Image.open(BytesIO(result))
    assert out.size == (800, 600)


def test_compress_rgba_converts_to_rgb():
    data = make_png_rgba(200, 200)
    result = _compress(data)
    assert Image.open(BytesIO(result)).format == "WEBP"
    out = Image.open(BytesIO(result))
    assert out.mode == "RGB"


def test_bad_bytes_rejected():
    # Undecodable bytes must never be stored as-is (stored XSS via .html/.svg)
    with pytest.raises(HTTPException) as exc:
        _compress(b"not an image")
    assert exc.value.status_code == 400


def test_compress_exif_orientation():
    # Orientation 6 = 90° CW; a 100×200 image becomes 200×100 after transpose
    data = make_jpeg_with_exif_orientation(100, 200, orientation=6)
    result = _compress(data)
    assert Image.open(BytesIO(result)).format == "WEBP"
    out = Image.open(BytesIO(result))
    w, h = out.size
    assert w > h
