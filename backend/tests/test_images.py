import io
import struct
import zlib

import pytest


# Minimal valid 1x1 JPEG bytes
def _make_jpeg() -> bytes:
    # SOI + APP0 + minimal SOF/SOS — simplest valid JFIF
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),\x01\x01\x01\x01"
        b"\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
        b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00"
        b"\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08"
        b"\x09\x0a\x0b"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xf5\x0a\xff\xd9"
    )


JPEG = _make_jpeg()
ENTRY_PAYLOAD = {
    "date": "2020-06-15",
    "day_text": "day",
    "thought_text": "thought",
    "tomorrow_text": "tomorrow",
}


async def _create_entry(client, headers):
    resp = await client.post("/entries", headers=headers, json=ENTRY_PAYLOAD)
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_upload_image(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("app.services.image_service.settings.UPLOAD_DIR", str(tmp_path))

    entry_id = await _create_entry(client, auth_headers)
    resp = await client.post(
        f"/entries/{entry_id}/images",
        headers=auth_headers,
        files={"file": ("photo.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["url"].startswith("/static/")
    filename = data["filename"]
    assert (tmp_path / filename).exists()


@pytest.mark.asyncio
async def test_delete_image(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("app.services.image_service.settings.UPLOAD_DIR", str(tmp_path))

    entry_id = await _create_entry(client, auth_headers)
    upload = await client.post(
        f"/entries/{entry_id}/images",
        headers=auth_headers,
        files={"file": ("photo.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert upload.status_code == 201
    img_id = upload.json()["id"]
    filename = upload.json()["filename"]

    del_resp = await client.delete(f"/entries/{entry_id}/images/{img_id}", headers=auth_headers)
    assert del_resp.status_code == 204
    assert not (tmp_path / filename).exists()

    get_resp = await client.get(f"/entries/{entry_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["images"] == []


@pytest.mark.asyncio
async def test_upload_non_image(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("app.services.image_service.settings.UPLOAD_DIR", str(tmp_path))

    entry_id = await _create_entry(client, auth_headers)
    resp = await client.post(
        f"/entries/{entry_id}/images",
        headers=auth_headers,
        files={"file": ("data.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_to_other_user_entry(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("app.services.image_service.settings.UPLOAD_DIR", str(tmp_path))

    other_resp = await client.post("/auth/register", json={"email": "other@example.com", "password": "password123"})
    other_headers = {"Authorization": f"Bearer {other_resp.json()['access_token']}"}
    entry_id = await _create_entry(client, other_headers)

    resp = await client.post(
        f"/entries/{entry_id}/images",
        headers=auth_headers,
        files={"file": ("photo.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_image_from_other_user_entry(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("app.services.image_service.settings.UPLOAD_DIR", str(tmp_path))

    other_resp = await client.post("/auth/register", json={"email": "other@example.com", "password": "password123"})
    other_headers = {"Authorization": f"Bearer {other_resp.json()['access_token']}"}
    entry_id = await _create_entry(client, other_headers)

    upload = await client.post(
        f"/entries/{entry_id}/images",
        headers=other_headers,
        files={"file": ("photo.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert upload.status_code == 201
    img_id = upload.json()["id"]

    resp = await client.delete(f"/entries/{entry_id}/images/{img_id}", headers=auth_headers)
    assert resp.status_code == 404
