import io

import pytest

from app.config import check_production_settings


@pytest.mark.asyncio
async def test_register_closed_by_default(client, monkeypatch):
    monkeypatch.setattr("app.config.settings.ALLOW_REGISTRATION", False)
    resp = await client.post("/auth/register", json={"email": "new@example.com", "password": "password123"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_login_works_with_registration_closed(client, monkeypatch):
    await client.post("/auth/register", json={"email": "me@example.com", "password": "password123"})
    monkeypatch.setattr("app.config.settings.ALLOW_REGISTRATION", False)
    resp = await client.post("/auth/login", json={"email": "me@example.com", "password": "password123"})
    assert resp.status_code == 200


def test_default_secret_key_refused(monkeypatch):
    monkeypatch.setattr("app.config.settings.DEBUG", False)
    monkeypatch.setattr("app.config.settings.SECRET_KEY", "change-me-in-production")
    with pytest.raises(RuntimeError):
        check_production_settings()


def test_short_secret_key_warns(monkeypatch, caplog):
    monkeypatch.setattr("app.config.settings.DEBUG", False)
    monkeypatch.setattr("app.config.settings.SECRET_KEY", "asdf-1234")
    check_production_settings()
    assert "shorter than" in caplog.text


def test_strong_secret_key_accepted(monkeypatch):
    monkeypatch.setattr("app.config.settings.DEBUG", False)
    monkeypatch.setattr("app.config.settings.SECRET_KEY", "a" * 64)
    check_production_settings()


@pytest.mark.asyncio
async def test_docs_disabled_in_production(client):
    assert (await client.get("/docs")).status_code == 404
    assert (await client.get("/openapi.json")).status_code == 404


@pytest.mark.asyncio
async def test_entries_limit_capped(client, auth_headers):
    resp = await client.get("/entries?limit=1000000", headers=auth_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_entries_limit_boundary(client, auth_headers):
    # Frontend loads the whole journal with limit=500
    assert (await client.get("/entries?page=1&limit=500", headers=auth_headers)).status_code == 200
    assert (await client.get("/entries?page=1&limit=501", headers=auth_headers)).status_code == 422


@pytest.mark.asyncio
async def test_entry_text_too_long(client, auth_headers):
    resp = await client.post(
        "/entries",
        headers=auth_headers,
        json={"date": "2020-06-15", "day_text": "x" * 20_001},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_html_disguised_as_jpeg_rejected(client, auth_headers, tmp_path, monkeypatch):
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    monkeypatch.setattr("app.services.image_service.settings.UPLOAD_DIR", str(uploads))
    entry = await client.post("/entries", headers=auth_headers, json={"date": "2020-06-15", "day_text": "day"})
    payload = b"\xff\xd8\xff<html><script>alert(1)</script></html>"
    resp = await client.post(
        f"/entries/{entry.json()['id']}/images",
        headers=auth_headers,
        files={"file": ("x.html", io.BytesIO(payload), "image/jpeg")},
    )
    assert resp.status_code == 400
    assert list(uploads.iterdir()) == []


@pytest.mark.asyncio
async def test_non_webp_riff_rejected(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.image_service.settings.UPLOAD_DIR", str(tmp_path))
    entry = await client.post("/entries", headers=auth_headers, json={"date": "2020-06-15", "day_text": "day"})
    resp = await client.post(
        f"/entries/{entry.json()['id']}/images",
        headers=auth_headers,
        files={"file": ("a.wav", io.BytesIO(b"RIFF\x00\x00\x00\x00WAVEfmt "), "image/webp")},
    )
    assert resp.status_code == 400


def test_rate_limit_key_uses_cloudflare_ip():
    from starlette.requests import Request

    from app.limiter import client_ip

    scope = {
        "type": "http",
        "headers": [(b"cf-connecting-ip", b"203.0.113.7")],
        "client": ("10.0.0.1", 1234),
    }
    assert client_ip(Request(scope)) == "203.0.113.7"
