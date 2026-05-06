import pytest
from datetime import date


TODAY = date.today().isoformat()
OTHER_DATE = "2020-06-15"


@pytest.mark.asyncio
async def test_create_entry(client, auth_headers):
    resp = await client.post("/entries", headers=auth_headers, json={
        "date": TODAY,
        "day_text": "Great day",
        "thought_text": "Some thoughts",
        "tomorrow_text": "Plans for tomorrow",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["date"] == TODAY
    assert data["day_text"] == "Great day"
    assert data["thought_text"] == "Some thoughts"
    assert data["tomorrow_text"] == "Plans for tomorrow"
    assert data["images"] == []


@pytest.mark.asyncio
async def test_create_duplicate_date(client, auth_headers):
    await client.post("/entries", headers=auth_headers, json={
        "date": OTHER_DATE,
        "day_text": "First",
        "thought_text": "First",
        "tomorrow_text": "First",
    })
    resp = await client.post("/entries", headers=auth_headers, json={
        "date": OTHER_DATE,
        "day_text": "Second",
        "thought_text": "Second",
        "tomorrow_text": "Second",
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_entries(client, auth_headers):
    await client.post("/entries", headers=auth_headers, json={
        "date": OTHER_DATE,
        "day_text": "Day",
        "thought_text": "Thought",
        "tomorrow_text": "Tomorrow",
    })
    resp = await client.get("/entries", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert isinstance(data["items"], list)
    assert isinstance(data["streak"], int)


@pytest.mark.asyncio
async def test_get_entry_by_id(client, auth_headers):
    create_resp = await client.post("/entries", headers=auth_headers, json={
        "date": OTHER_DATE,
        "day_text": "Day",
        "thought_text": "Thought",
        "tomorrow_text": "Tomorrow",
    })
    entry_id = create_resp.json()["id"]
    resp = await client.get(f"/entries/{entry_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == entry_id


@pytest.mark.asyncio
async def test_get_entry_other_user(client, auth_headers):
    other_resp = await client.post("/auth/register", json={"email": "other@example.com", "password": "password123"})
    other_headers = {"Authorization": f"Bearer {other_resp.json()['access_token']}"}

    create_resp = await client.post("/entries", headers=other_headers, json={
        "date": OTHER_DATE,
        "day_text": "Other's day",
        "thought_text": "Other's thought",
        "tomorrow_text": "Other's tomorrow",
    })
    entry_id = create_resp.json()["id"]

    resp = await client.get(f"/entries/{entry_id}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_entry(client, auth_headers):
    create_resp = await client.post("/entries", headers=auth_headers, json={
        "date": OTHER_DATE,
        "day_text": "Original",
        "thought_text": "Original",
        "tomorrow_text": "Original",
    })
    entry_id = create_resp.json()["id"]

    resp = await client.put(f"/entries/{entry_id}", headers=auth_headers, json={"day_text": "Updated"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["day_text"] == "Updated"
    assert data["thought_text"] == "Original"


@pytest.mark.asyncio
async def test_delete_entry(client, auth_headers):
    create_resp = await client.post("/entries", headers=auth_headers, json={
        "date": OTHER_DATE,
        "day_text": "To delete",
        "thought_text": "To delete",
        "tomorrow_text": "To delete",
    })
    entry_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/entries/{entry_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    get_resp = await client.get(f"/entries/{entry_id}", headers=auth_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_today_entry_exists(client, auth_headers):
    await client.post("/entries", headers=auth_headers, json={
        "date": TODAY,
        "day_text": "Today's entry",
        "thought_text": "Today's thoughts",
        "tomorrow_text": "Tomorrow's plans",
    })
    resp = await client.get("/entries/today", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data is not None
    assert data["date"] == TODAY


@pytest.mark.asyncio
async def test_today_entry_missing(client, auth_headers):
    resp = await client.get("/entries/today", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() is None
