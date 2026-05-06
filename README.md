# Memoir

Memoir is a personal journal web app where you can write private entries, attach images, and reflect on your thoughts over time. No external services required — everything runs locally.

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | FastAPI (Python 3.12) + Uvicorn   |
| Frontend | React 18 + TypeScript + Vite      |
| Database | SQLite                            |
| Storage  | Local file system (`uploads/`)    |

> No external database or storage service required — everything lives in `memoir.db` and `uploads/`.

## Prerequisites

- Docker & Docker Compose

## Quick Start

```bash
git clone <repo-url>
cd memoir
cp backend/.env.example backend/.env
docker-compose up --build
```

- Backend:  http://localhost:8000
- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs

## Roadmap

### Phase 2: Auth (JWT)

### Phase 3: Entries API

### Phase 4: Images (multipart upload → /uploads folder)

### Phase 5: Frontend pages

### Phase 6: AI reflection (Claude)
