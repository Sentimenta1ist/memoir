import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.database import Base, get_db
from app.main import app, limiter


@pytest_asyncio.fixture
async def db_session(tmp_path):
    db_file = tmp_path / "test.db"
    test_url = f"sqlite+aiosqlite:///{db_file}"
    engine = create_async_engine(test_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    session = session_factory()
    yield session

    await session.close()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session, monkeypatch):
    # Registration is closed by default in production; tests create users through it
    monkeypatch.setattr("app.config.settings.ALLOW_REGISTRATION", True)
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    limiter.enabled = False
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    limiter.enabled = True

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(client):
    resp = await client.post("/auth/register", json={"email": "test@memoir.app", "password": "test-password-123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
