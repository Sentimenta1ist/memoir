# Memoir

A minimalist evening-journal PWA: three short blocks a day, optional photos, a streak counter.

Built as a full-stack showcase: async FastAPI + PostgreSQL backend, React + TypeScript frontend, Docker Compose for local runs.

## What it does

Each day has one entry made of exactly three blocks:

| Block | Purpose |
|-------|---------|
| Day | What happened today, in a few sentences |
| Mind | One idea from reading, watching or thinking |
| Tomorrow | One specific action |

- Email/password auth with short-lived access tokens and refresh tokens (auto-refreshed on 401).
- One entry per user per date; a calendar view and a streak counter on the home page.
- Photo upload per entry: type check by magic bytes, 10 MB limit, EXIF rotation applied, resized to a 1200 px long side and stored as WebP.
- PWA manifest and mobile-first layout (safe-area insets, standalone display mode).
- Rate limiting on the auth endpoints (`slowapi`).

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Zustand, React Router, Axios |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.0 (async), Alembic, Pydantic Settings |
| Database | PostgreSQL 16 (asyncpg) |
| Images | Pillow, files on disk served via FastAPI `StaticFiles` |
| Auth | JWT (python-jose), bcrypt |
| Tests | pytest + pytest-asyncio + httpx (SQLite via aiosqlite), Vitest + Testing Library |
| Packaging | Docker, Docker Compose, nginx (serves the built frontend) |

## Architecture

```
 Browser (PWA)
     |
     v
 nginx :80  ---- static React build (Vite)
     |
     |  Axios + JWT (Bearer)
     v
 FastAPI :8000 ----- routes: health, auth, entries, images
     |   \
     |    +-- services: auth, entry_service, image_service
     |    +-- /static  -> uploaded images on disk (volume)
     v
 PostgreSQL 16  (users, entries, images)  -- migrations: Alembic
```

## Run locally

Requires Docker with Compose.

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

`docker-compose.yml` starts Postgres, the backend (which runs `alembic upgrade head` before `uvicorn`), and the frontend (built with `VITE_API_URL=http://localhost:8000`). Open the frontend, switch to registration on the login screen (password of at least 8 characters) and create an account.

### Configuration

| Variable | Where | Meaning |
|----------|-------|---------|
| `DATABASE_URL` | backend | Must use the `postgresql+asyncpg://` scheme |
| `SECRET_KEY` | backend | JWT signing key; with `DEBUG=false` the API refuses to start on the default value and warns if it is shorter than 32 characters (`openssl rand -hex 32`) |
| `DEBUG` | backend | `false` by default; `true` enables Swagger at `/docs` and SQL logging |
| `ALLOW_REGISTRATION` | backend | `false` by default: `/auth/register` returns 403 |
| `CORS_ORIGINS` | backend | JSON list of allowed origins |
| `UPLOAD_DIR` | backend | Image directory (default `uploads`) |
| `VITE_API_URL` | frontend | API base URL, baked in at build time |
| `VITE_ALLOW_REGISTRATION` | frontend | `true` shows the "Create account" tab, baked in at build time |

Examples are in `backend/.env.example` and `frontend/.env.example`. The backend also reads `APP_NAME`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` and `REFRESH_TOKEN_EXPIRE_DAYS` (see `backend/app/config.py`).

## Testing

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest

# Frontend
cd frontend
npm ci
npm test        # vitest run
```

Backend tests use a temporary SQLite database, so no running Postgres is needed. Coverage: auth and registration, entry CRUD and integration flows, image upload and compression. Frontend tests cover the login/home/write/read pages and the entry calendar.

## Design notes

- **Session layering.** Services only `flush`; routes own the `commit`. This keeps each request a single transaction.
- **Ownership checks.** Every entry query filters by both entry id and user id, so another user's entry returns 404.
- **Route order.** `GET /entries/today` is registered before `/entries/{entry_id}` so it is not captured as an id.
- **Naive UTC timestamps.** Columns are `timezone=False` and written with `datetime.utcnow()`, since asyncpg rejects aware datetimes for such columns.
- **Image pipeline.** Uploads are validated by content type and magic bytes, then normalised (EXIF transpose, alpha flattened onto the app background, downscaled, WebP). If compression fails, the original bytes are stored.
- **Token handling.** Access and refresh tokens live in a Zustand store mirrored to `localStorage`; an Axios interceptor refreshes on 401.
- **Migrations on boot.** The backend container runs `alembic upgrade head` on every start.

## Project layout

```
.
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── alembic/            # migrations
│   ├── app/
│   │   ├── main.py         # app, CORS, rate limiter, static mounts
│   │   ├── config.py       # settings from env / .env
│   │   ├── routes/         # health, auth, entries, images
│   │   ├── services/       # auth, entry_service, image_service
│   │   ├── models/         # user, entry, image
│   │   └── schemas/        # Pydantic models
│   ├── static/placeholders/  # sample images offered in the UI
│   └── tests/
└── frontend/
    ├── Dockerfile, nginx.conf
    ├── public/             # manifest.json, icons
    └── src/
        ├── pages/          # Login, Home, Write, Read
        ├── components/     # ImageFlow, EntryCalendar, DatePickerSheet, Toast, ...
        ├── store/          # auth and toast stores
        └── api/client.ts   # Axios client with token refresh
```
