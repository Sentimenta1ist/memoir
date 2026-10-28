import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.limiter import limiter

from app.config import settings, check_production_settings
from app.database import init_db
import app.models  # noqa: F401 — ensure all models register with Base.metadata
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.entries import router as entries_router
from app.routes.images import router as images_router

logger = logging.getLogger(__name__)

_PLACEHOLDERS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "placeholders")


@asynccontextmanager
async def lifespan(app: FastAPI):
    check_production_settings()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await init_db()
    yield


# Swagger and the OpenAPI schema stay local-only
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
