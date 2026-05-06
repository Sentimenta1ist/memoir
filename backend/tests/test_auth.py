import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post("/auth/register", json={"email": "test@example.com", "password": "password123"})
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post("/auth/register", json={"email": "dup@example.com", "password": "password123"})
    resp = await client.post("/auth/register", json={"email": "dup@example.com", "password": "password123"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/auth/register", json={"email": "login@example.com", "password": "password123"})
    resp = await client.post("/auth/login", json={"email": "login@example.com", "password": "password123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/auth/register", json={"email": "wrongpass@example.com", "password": "password123"})
    resp = await client.post("/auth/login", json={"email": "wrongpass@example.com", "password": "wrongpassword"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    resp = await client.post("/auth/login", json={"email": "nobody@example.com", "password": "password123"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_valid(client):
    resp = await client.post("/auth/register", json={"email": "refresh@example.com", "password": "password123"})
    refresh_token = resp.json()["refresh_token"]
    resp2 = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp2.status_code == 200
    data = resp2.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_garbage_token(client):
    resp = await client.post("/auth/refresh", json={"refresh_token": "garbage.token.here"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_valid_token(client):
    resp = await client.post("/auth/register", json={"email": "me@example.com", "password": "password123"})
    access_token = resp.json()["access_token"]
    resp2 = await client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert resp2.status_code == 200
    data = resp2.json()
    assert data["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_me_no_token(client):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401
