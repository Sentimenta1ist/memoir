import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.config import settings
from app.database import init_db, AsyncSessionLocal
import app.models  # noqa: F401 — ensure all models register with Base.metadata
from app.models.user import User
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.entries import router as entries_router
from app.routes.images import router as images_router
from app.services.auth import hash_password

logger = logging.getLogger(__name__)

_PLACEHOLDERS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "static", "placeholders")


async def seed_default_user():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@memoir.app"))
        if result.scalar_one_or_none():
            logger.info("Default user already exists")
            return
        user = User(email="admin@memoir.app", password_hash=hash_password("***REMOVED***"))
        db.add(user)
        await db.commit()
        logger.info("Default user created: admin@memoir.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await init_db()
    await seed_default_user()
    yield


app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/static/placeholders/index")
async def placeholders_index():
    if not os.path.isdir(_PLACEHOLDERS_DIR):
        return JSONResponse({"files": []})
    files = sorted(
        f for f in os.listdir(_PLACEHOLDERS_DIR)
        if os.path.isfile(os.path.join(_PLACEHOLDERS_DIR, f)) and not f.startswith(".")
    )
    return JSONResponse({"files": files})


if os.path.isdir(_PLACEHOLDERS_DIR):
    app.mount("/static/placeholders", StaticFiles(directory=_PLACEHOLDERS_DIR), name="placeholders")

app.mount("/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(entries_router)
app.include_router(images_router)
