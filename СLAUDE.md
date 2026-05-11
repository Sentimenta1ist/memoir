## Project
Personal evening journal app. React + FastAPI + PostgreSQL. Deployed on Coolify at memoir.qear.net.

## Critical rules
- All DateTime columns are `timezone=False`. Always use `datetime.utcnow()`, NEVER `datetime.now(timezone.utc)` — asyncpg rejects aware datetimes
- `updated_at` is set manually in service layer, not via SQLAlchemy `onupdate`
- `/entries/today` route must be registered BEFORE `/{id}` in the router
- DATABASE_URL must use `postgresql+asyncpg://` not `postgres+asyncpg://`
- Flush in services, commit in routes — never commit inside a service function
- All entry queries filter by both `id` AND `user_id` — no IDOR

## Auth
JWT access (30min) + refresh (30 days). Tokens in Zustand store + mirrored to localStorage. Axios interceptor auto-refreshes on 401.

## Images
Stored on disk at `/app/uploads/`, served via FastAPI StaticFiles at `/static/`. Filename = `uuid4 + original extension`. Coolify persistent volume at `/app/uploads`.

## Deployment
Coolify v4, Hetzner VPS. Cloudflare wildcard DNS `*` → VPS. Auto-deploy on push to master.
- Frontend: `memoir.qear.net`, Dockerfile at `/frontend/Dockerfile`
- Backend: `memoir-api.qear.net`, Dockerfile at `/backend/Dockerfile`
- Backend CMD: `alembic upgrade head && uvicorn ...` (migrations on every start)

## Known issues
- No rate limiting on auth endpoints
- Swagger open in production
- No DB backups configured