import io

import pytest

from tests.test_images import JPEG

ENTRY_DATE = "2021-03-10"
ENTRY_PAYLOAD = {
    "date": ENTRY_DATE,
    "day_text": "original day",
    "thought_text": "original thought",
    "tomorrow_text": "original tomorrow",
}


async def _create(client, headers, payload=None):
    resp = await client.post("/entries", headers=headers, json=payload or ENTRY_PAYLOAD)
    assert resp.status_code == 201
    return resp.json()["id"]


async def _fetch(client, headers, entry_id):
    resp = await client.get(f"/entries/{entry_id}", headers=headers)
    assert resp.status_code == 200
    return resp.json()


@pytest.mark.asyncio
async def test_text_update_persists(client, auth_headers):
    entry_id = await _create(client, auth_headers)

    put_resp = await client.put(
        f"/entries/{entry_id}",
        headers=auth_headers,
        json={"day_text": "updated day", "thought_text": "updated thought"},
    )
    assert put_resp.status_code == 200

    data = await _fetch(client, auth_headers, entry_id)
    assert data["day_text"] == "updated day"
    assert data["thought_text"] == "updated thought"
    assert data["tomorrow_text"] == "original tomorrow"


@pytest.mark.asyncio
async def test_photo_upload_persists(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("app.services.image_service.settings.UPLOAD_DIR", str(tmp_path))

    entry_id = await _create(client, auth_headers)

    upload_resp = await client.post(
        f"/entries/{entry_id}/images",
        headers=auth_headers,
        files={"file": ("photo.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert upload_resp.status_code == 201

    data = await _fetch(client, auth_headers, entry_id)
    assert len(data["images"]) == 1
    assert data["images"][0]["url"].startswith("/static/")


@pytest.mark.asyncio
async def test_text_update_preserves_photos(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("app.services.image_service.settings.UPLOAD_DIR", str(tmp_path))

    entry_id = await _create(client, auth_headers)

    await client.post(
        f"/entries/{entry_id}/images",
        headers=auth_headers,
        files={"file": ("photo.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )

    put_resp = await client.put(
        f"/entries/{entry_id}",
        headers=auth_headers,
        json={"day_text": "changed after photo"},
    )
    assert put_resp.status_code == 200

    data = await _fetch(client, auth_headers, entry_id)
    assert data["day_text"] == "changed after photo"
    assert len(data["images"]) == 1
