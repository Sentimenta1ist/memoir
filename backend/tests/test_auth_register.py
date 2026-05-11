import pytest


@pytest.mark.asyncio
async def test_register_valid(client):
    resp = await client.post("/auth/register", json={"email": "new@example.com", "password": "password123"})
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post("/auth/register", json={"email": "dupe@example.com", "password": "password123"})
    resp = await client.post("/auth/register", json={"email": "dupe@example.com", "password": "password123"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_password_too_short(client):
    resp = await client.post("/auth/register", json={"email": "short@example.com", "password": "1234567"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email(client):
    resp = await client.post("/auth/register", json={"email": "not-an-email", "password": "password123"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_then_login(client):
    await client.post("/auth/register", json={"email": "logintest@example.com", "password": "password123"})
    resp = await client.post("/auth/login", json={"email": "logintest@example.com", "password": "password123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
