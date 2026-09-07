# Memoir

Personal evening journal app. One page per day, three blocks. Designed as a private ritual, not a productivity tool.

---

## Project overview

Memoir enforces a deliberate structure: every entry has exactly three blocks.

| # | Label | Purpose |
|---|-------|---------|
| 01 | **DAY** | 3–4 sentences about what happened — "just so the day stays" |
| 02 | **MIND** | One idea from reading, watching, or thinking |
| 03 | **TOMORROW** | One specific action, not a list |

The read view renders photos as floated circles and rounded squares with CSS `shape-outside`, wrapping text around them like a sketchbook. The app ships as a PWA and runs fullscreen when added to the iOS home screen.

**Target user:** one person (the author). There is no sign-up flow in the UI — accounts are created via API or the seeded default.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript + Vite 5 + TanStack Query 5 + Zustand 4 |
| Backend | FastAPI + Python 3.12 + SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 16 via asyncpg |
| Images | Stored raw on disk at `/app/uploads/` — **no Pillow/WebP conversion despite docs claiming otherwise** (see Code review findings) |
| Auth | JWT — access token (30 min) + refresh token (30 days, stateless) |
| Deploy | Coolify v4 on Hetzner 8 GB VPS |
| DNS | Cloudflare wildcard A `*` → VPS IP |
| Domains | `memoir.qear.net` (frontend), `memoir-api.qear.net` (backend) |

---

## Full repo map

```
memoir/
├── README.md                            this file
├── СLAUDE.md                            brief context for Claude Code sessions
├── docker-compose.yml                   local dev: postgres + backend + frontend
│
├── backend/
│   ├── Dockerfile                       python:3.12-slim; runs alembic then uvicorn
│   ├── requirements.txt                 pinned Python deps (no Pillow — see findings)
│   ├── pytest.ini                       asyncio_mode = auto
│   ├── alembic.ini                      alembic config; sqlalchemy.url default is localhost
│   ├── .env.example                     template for backend env vars
│   ├── .env                             ⚠ dev env file committed to git
│   ├── memoir.db                        ⚠ SQLite file committed to git (leftover)
│   │
│   ├── alembic/
│   │   ├── env.py                       async alembic runner; reads DATABASE_URL from settings
│   │   ├── script.py.mako               migration file template
│   │   └── versions/
│   │       ├── 441fa6562f08_initial_schema.py   creates users, entries, images tables
│   │       └── 002_entries_images.py            no-op (upgrade = pass); dead migration
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                      FastAPI app factory; lifespan, CORS, StaticFiles, seed user
│   │   ├── config.py                    pydantic-settings BaseSettings; reads .env
│   │   ├── database.py                  async engine + AsyncSessionLocal + get_db + init_db
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py              re-exports User, Entry, Image (registers with Base.metadata)
│   │   │   ├── user.py                  User ORM model
│   │   │   ├── entry.py                 Entry ORM model; UNIQUE(user_id, date)
│   │   │   └── image.py                 Image ORM model; FK → entries(id) CASCADE
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                  RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse
│   │   │   └── entries.py               EntryCreate, EntryUpdate, EntryResponse, EntryListResponse, ImageResponse
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── health.py                GET /health
│   │   │   ├── auth.py                  POST /auth/register|login|refresh; GET /auth/me; get_current_user dependency
│   │   │   ├── entries.py               full CRUD /entries; /entries/today must precede /{id}
│   │   │   └── images.py                POST/DELETE /entries/{id}/images[/{img_id}]
│   │   │
│   │   └── services/
│   │       ├── __init__.py              empty
│   │       ├── auth.py                  bcrypt hash/verify; JWT create/decode
│   │       ├── entry_service.py         get/create/update/delete entries; streak calculation
│   │       └── image_service.py         validate, save to disk, record in DB; delete from disk + DB
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                  SQLite in-memory fixtures; client + auth_headers
│   │   ├── test_auth.py                 register, login, refresh, /me happy + error paths
│   │   ├── test_entries.py              CRUD + IDOR + today endpoint
│   │   ├── test_images.py               upload, delete, access control, wrong content-type
│   │   └── test_entry_integration.py    cross-feature: text update preserves photos; photo upload persists
│   │
│   └── uploads/
│       └── .gitkeep                     ensures directory exists; actual uploads not committed
│
└── frontend/
    ├── Dockerfile                       multi-stage: node:20-alpine builder + nginx:alpine
    ├── nginx.conf                       SPA catch-all: try_files → /index.html
    ├── index.html                       PWA meta tags, viewport-fit=cover, Google Fonts
    ├── package.json                     scripts: dev / build / preview
    ├── vite.config.ts                   Vite dev server port 5173; /api proxy (unused — see findings)
    ├── tsconfig.json                    strict mode, noUnusedLocals, ES2020, bundler resolution
    ├── .env.example                     VITE_API_URL template
    ├── .env.local                       dev override: VITE_API_URL=http://localhost:8000
    │
    ├── public/
    │   ├── manifest.json                PWA manifest: standalone display, portrait, dark bg
    │   ├── icon-192.png                 PWA icon
    │   └── icon-512.png                 PWA icon
    │
    └── src/
        ├── main.tsx                     React root; QueryClientProvider (staleTime 60s); StrictMode
        ├── App.tsx                      router definition; boot-time /auth/me hydration
        ├── styles.css                   all styles — single flat CSS file, no preprocessor
        ├── types.ts                     ImageResponse, EntryResponse, EntryListResponse TS interfaces
        │
        ├── api/
        │   └── client.ts               axios instance; request interceptor (Bearer token); 401 auto-refresh
        │
        ├── store/
        │   ├── authStore.ts             Zustand: accessToken, refreshToken, user; localStorage mirror
        │   └── toastStore.ts            Zustand: message + show; auto-hide after 2100 ms
        │
        ├── pages/
        │   ├── LoginPage.tsx            email/password form; login → /auth/me → navigate /
        │   ├── HomePage.tsx             embedded calendar + streak, today pill, entry list, FAB
        │   ├── WritePage.tsx            new/edit entry; image add/remove; deferred uploads on save
        │   └── ReadPage.tsx             read-only view; ImageFlow for day text; delete confirmation
        │
        ├── components/
        │   ├── ProtectedRoute.tsx       redirects to /login if no accessToken in store
        │   ├── EntryCalendar.tsx        month grid + streak header; embedded on HomePage (no separate route)
        │   ├── ImageFlow.tsx            CSS shape-outside float layout; 5-shape cycle
        │   └── Toast.tsx               renders .toast div; show class driven by toastStore
        │
        ├── hooks/
        │   └── useAutoResizeTextarea.ts  textarea auto-grow; no-ops when CSS field-sizing is supported
        │
        └── utils/
            └── entryDateMap.ts          builds a date → entry id Map from the entries list, for the calendar
```

---

## Backend deep-dive

### Routes

#### `GET /health`
- **Auth:** none
- **Response:** `{"status": "ok", "service": "memoir-ap"}` *(typo: `memoir-ap` not `memoir-api`)*
- **Errors:** none

---

#### `POST /auth/register`
- **Auth:** none
- **Request:** `{"email": "...", "password": "..."}`  — `email` is validated as `EmailStr`; `password` is plain `str` with no minimum length
- **Response 201:** `{"access_token": "...", "refresh_token": "...", "token_type": "bearer"}`
- **Errors:** 409 if email already registered

---

#### `POST /auth/login`
- **Auth:** none
- **Request:** `{"email": "...", "password": "..."}`
- **Response 200:** same `TokenResponse`
- **Errors:** 401 for bad credentials (email not found or wrong password — same message to avoid enumeration)

---

#### `POST /auth/refresh`
- **Auth:** none (carries refresh token in body)
- **Request:** `{"refresh_token": "..."}`
- **Response 200:** fresh `TokenResponse` (both tokens rotated)
- **Errors:** 401 if token malformed, expired, wrong type, or user deleted
- **Note:** tokens are stateless JWTs — no DB record, so old tokens can't be revoked

---

#### `GET /auth/me`
- **Auth:** Bearer access token
- **Response 200:** `{"id": "...", "email": "...", "created_at": "ISO-string"}`
- **Errors:** 401 if no/invalid token

---

#### `GET /entries`
- **Auth:** Bearer access token
- **Query params:** `page` (default 1), `limit` (default 20)
- **Response 200:** `{"items": [EntryResponse], "total": int, "streak": int}`
- **Notes:** ordered by `date DESC`; streak calculated by loading all user entry dates into Python memory then walking backward from today

---

#### `POST /entries`
- **Auth:** Bearer access token
- **Request:** `{"date": "YYYY-MM-DD", "day_text": "...", "thought_text": "...", "tomorrow_text": "..."}` — all three text fields are required and must be non-empty (`min_length=1`)
- **Response 201:** `EntryResponse` with `images: []`
- **Errors:** 409 if entry for that date already exists for this user

---

#### `GET /entries/today`
- **Auth:** Bearer access token
- **Response 200:** `EntryResponse | null`
- **Notes:** uses `date.today()` — server-local date, not UTC; **must be registered before `/{entry_id}` in the router** or FastAPI routes `today` as an ID

---

#### `GET /entries/{entry_id}`
- **Auth:** Bearer access token
- **Response 200:** `EntryResponse` including `images[]`
- **Errors:** 404 if not found or belongs to another user (IDOR protected)

---

#### `PUT /entries/{entry_id}`
- **Auth:** Bearer access token
- **Request:** `{"day_text": "...", "thought_text": "...", "tomorrow_text": "..."}` — all fields optional; only provided non-null fields are updated (`model_dump(exclude_none=True)`)
- **Response 200:** updated `EntryResponse`
- **Errors:** 404 if not found
- **Note:** you cannot clear a field to empty/null via PUT — the schema enforces `min_length=1` on non-null values

---

#### `DELETE /entries/{entry_id}`
- **Auth:** Bearer access token
- **Response 204:** no body
- **Errors:** 404 if not found
- **Note:** cascade deletes images from DB; `image_service.delete_image` removes files from disk

---

#### `POST /entries/{entry_id}/images`
- **Auth:** Bearer access token
- **Request:** `multipart/form-data`, field name `file`
- **Response 201:** `ImageResponse`
- **Errors:** 400 if content-type doesn't start with `image/`; 400 if file > 10 MB; 404 if entry not found or wrong user
- **Note:** validates content-type only (client-supplied, not byte-inspected); saves original bytes with original extension (no WebP conversion)

---

#### `DELETE /entries/{entry_id}/images/{img_id}`
- **Auth:** Bearer access token
- **Response 204:** no body
- **Errors:** 404 if entry not found, wrong user, or image not found
- **Note:** deletes file from disk, then DB record; `db.expire(entry)` forces reload of images relationship

---

### Models

#### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `VARCHAR` | PK, default `uuid4()` |
| `email` | `VARCHAR` | UNIQUE, NOT NULL |
| `password_hash` | `VARCHAR` | NOT NULL |
| `created_at` | `TIMESTAMP` | NOT NULL, `timezone=False`, default `datetime.utcnow()` |

Relationships: `entries` (one-to-many, back_populates)

---

#### `entries`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `VARCHAR` | PK, default `uuid4()` |
| `user_id` | `VARCHAR` | FK → `users.id`, NOT NULL |
| `date` | `DATE` | NOT NULL |
| `day_text` | `TEXT` | nullable |
| `thought_text` | `TEXT` | nullable |
| `tomorrow_text` | `TEXT` | nullable |
| `created_at` | `TIMESTAMP` | NOT NULL, `timezone=False`, default `datetime.utcnow()` |
| `updated_at` | `TIMESTAMP` | NOT NULL, `timezone=False`, default + `onupdate` `datetime.utcnow()` |

Table constraints: `UNIQUE(user_id, date)`

Relationships: `user` (many-to-one), `images` (one-to-many, ordered by `position`, cascade `all, delete-orphan`)

**Critical datetime rule:** All DateTime columns are `timezone=False`. Always use `datetime.utcnow()`. asyncpg with `TIMESTAMP WITHOUT TIME ZONE` rejects timezone-aware datetimes.

---

#### `images`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `VARCHAR` | PK, default `uuid4()` |
| `entry_id` | `VARCHAR` | FK → `entries.id`, NOT NULL |
| `filename` | `VARCHAR` | NOT NULL — `uuid4` + original extension (e.g. `.jpg`) |
| `url` | `VARCHAR` | NOT NULL — `/static/{filename}` |
| `position` | `INTEGER` | default 0, server_default `"0"` — count of existing images at upload time |
| `created_at` | `TIMESTAMP` | NOT NULL, `timezone=False` |

Relationships: `entry` (many-to-one)

---

### Services

#### `auth_service.py`

- `hash_password(password)` → bcrypt hash (auto-gensalt)
- `verify_password(plain, hashed)` → bcrypt compare
- `create_access_token(subject)` → JWT with `{"sub": user_id, "exp": now+30min, "type": "access"}`, signed HS256
- `create_refresh_token(subject)` → same but `exp: now+30days, "type": "refresh"`
- `decode_token(token)` → dict; raises `JWTError` on bad signature or expiry
- **Note:** uses `datetime.now(UTC)` (aware) for JWT `exp` — this is correct for python-jose's internal handling and does **not** touch asyncpg

---

#### `entry_service.py`

- `get_entries(db, user_id, page, limit)` → `(entries[], total, streak)` — two queries: count + paginated select with `selectinload(images)`, then `calculate_streak`
- `calculate_streak(db, user_id)` → loads all `Entry.date` for user into a Python `set`, then walks backward from today. Returns 0 if no entries. Counts a partial streak starting yesterday if today has no entry.
- `get_entry_by_id(db, entry_id, user_id)` → `Entry | None` with images loaded; filters by both id AND user_id (IDOR guard)
- `get_today_entry(db, user_id)` → `Entry | None`; uses `date.today()` (server-local)
- `create_entry(db, user_id, data)` → inserts Entry, `flush()`, re-queries with images loaded, returns Entry. **Does not commit** — caller must `await db.commit()`
- `update_entry(db, entry, data)` → iterates `model_dump(exclude_none=True)`, setattr; manually sets `entry.updated_at = datetime.utcnow()`; `flush()`. **Does not commit.**
- `delete_entry(db, entry)` → `db.delete(entry)`, `flush()`. **Does not commit.** Cascade removes images from DB; disk cleanup is not done here — callers must also call `image_service.delete_image` for each image if they want to clean the disk (current `delete_entry` route does not — files are orphaned on disk when an entry is deleted).

---

#### `image_service.py`

- `save_image(db, entry_id, file)`:
  1. Check `file.content_type.startswith("image/")` — raises 400 if not
  2. Read all bytes — raises 400 if > 10 MB (`MAX_SIZE = 10 * 1024 * 1024`)
  3. Determine suffix from `Path(file.filename).suffix` — original extension preserved
  4. Generate `filename = f"{uuid4()}{suffix}"` (e.g. `abc123.jpg`)
  5. Write raw bytes to `{UPLOAD_DIR}/{filename}`
  6. Count existing images for entry_id → use as `position`
  7. Create `Image` record, `flush()`, return Image
  8. **⚠ Does NOT compress to WebP or resize — Pillow is not imported or installed**
- `delete_image(db, image)`:
  1. `path.unlink()` — silently ignores `FileNotFoundError`
  2. `db.delete(image)`, `flush()`

---

### Schemas (Pydantic)

#### `auth.py`

| Schema | Fields |
|--------|--------|
| `RegisterRequest` | `email: EmailStr`, `password: str` (no min length) |
| `LoginRequest` | `email: EmailStr`, `password: str` |
| `TokenResponse` | `access_token: str`, `refresh_token: str`, `token_type: str = "bearer"` |
| `RefreshRequest` | `refresh_token: str` |
| `UserResponse` | `id: str`, `email: str`, `created_at: str` (ISO string, not datetime) |

#### `entries.py`

| Schema | Fields | Notes |
|--------|--------|-------|
| `EntryCreate` | `date: date`, `day_text: NonEmptyStr`, `thought_text: NonEmptyStr`, `tomorrow_text: NonEmptyStr` | all required |
| `EntryUpdate` | `day_text: NonEmptyStr \| None = None`, `thought_text: NonEmptyStr \| None = None`, `tomorrow_text: NonEmptyStr \| None = None` | all optional; can't clear to null |
| `ImageResponse` | `id`, `filename`, `url`, `position: int`, `created_at: datetime` | `from_attributes=True` |
| `EntryResponse` | `id`, `user_id`, `date`, `day_text \| None`, `thought_text \| None`, `tomorrow_text \| None`, `created_at`, `updated_at`, `images: [] = []` | `from_attributes=True` |
| `EntryListResponse` | `items: list[EntryResponse]`, `total: int`, `streak: int` | |

`NonEmptyStr = Annotated[str, Field(min_length=1)]`

---

### Alembic migrations

| File | Revision | What it does |
|------|----------|--------------|
| `441fa6562f08_initial_schema.py` | `441fa6562f08` | Creates all three tables: `users`, `entries`, `images` |
| `002_entries_images.py` | `002_entries_images` → depends on `441fa6562f08` | **No-op** — `upgrade()` is `pass`. Dead migration with wrong premise (tables already created in initial) |

**Boot sequence:** `Dockerfile CMD` runs `alembic upgrade head` then starts uvicorn. The `lifespan` handler also calls `init_db()` which runs `Base.metadata.create_all`. This dual schema initialization can diverge: if a migration adds a column, `create_all` won't re-run it, but if `create_all` runs first on a fresh DB it bypasses alembic tracking entirely.

---

### `config.py` — environment variables

| Variable | Type | Default | Notes |
|----------|------|---------|-------|
| `APP_NAME` | `str` | `"Memoir API"` | FastAPI title |
| `DEBUG` | `bool` | `True` | Enables SQLAlchemy echo; FastAPI debug mode; **Swagger always accessible regardless** |
| `DATABASE_URL` | `str` | `postgresql+asyncpg://memoir:memoir@localhost:5432/memoir` | Must use `postgresql+asyncpg://` not `postgres+asyncpg://` |
| `CORS_ORIGINS` | `list[str]` | `["http://localhost:5173"]` | Passed directly to `CORSMiddleware` |
| `UPLOAD_DIR` | `str` | `"uploads"` | Relative path; resolved from CWD at runtime |
| `SECRET_KEY` | `str` | `"change-me-in-production"` | JWT signing key — no validation that default has been changed |
| `ALGORITHM` | `str` | `"HS256"` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | `30` | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `int` | `30` | |

Reads from `.env` file via `SettingsConfigDict(env_file=".env")`.

---

### `dependencies.py`

There is no separate `dependencies.py`. The `get_current_user` dependency lives in `routes/auth.py`:

1. Extracts `HTTPAuthorizationCredentials` via `HTTPBearer(auto_error=False)` — returns `None` if no header (rather than auto-raising 401)
2. Raises 401 if credentials absent
3. Calls `decode_token(credentials.credentials)` — raises `JWTError` on bad/expired token → caught → 401
4. Checks `payload["type"] == "access"` — raises 401 if it's a refresh token used as access
5. Looks up user by `payload["sub"]` (user UUID) — raises 401 if not found

---

### `main.py` — app factory

```
lifespan():
  os.makedirs(UPLOAD_DIR, exist_ok=True)
  await init_db()          # Base.metadata.create_all (also done by alembic)
  await seed_default_user() # creates admin@memoir.app / ***REMOVED*** if absent
  yield

app = FastAPI(title, debug, lifespan)
CORS(allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
mount /static → StaticFiles(directory=UPLOAD_DIR)
include_router: health, auth, entries, images
```

---

## Frontend deep-dive

### Pages

#### `LoginPage.tsx`

- **Renders:** email + password form, gradient submit button, error message
- **API calls:**
  - `POST /auth/login` → stores tokens via `setTokens`
  - `GET /auth/me` → stores user via `setUser`
  - On success: `navigate('/')`
- **Loading state:** button shows "Signing in…", disabled
- **Error states:** 401 → "Invalid email or password"; other → "Something went wrong"
- **No registration UI** — app is single-user by design

---

#### `HomePage.tsx`

- **Renders:** header with logo + "•••" info button; embedded month calendar with streak number in its header (`EntryCalendar`, replaces the old standalone `/calendar` route and streak hero card); today pill (green "saved ✓" or accent-teal pulsing "+ write today"); entries section header; entry cards list; FAB "+"
- **API calls:** `GET /entries?page=1&limit=50` via TanStack Query (staleTime 60 s)
- **Derived state:** `todayEntry` = item matching today's date string; `streak` from response
- **FAB behavior:** if `todayEntry` exists → navigate to `/write/:id` (edit); otherwise → `/write` (new)
- **Info modal:** bottom sheet with user email + "Sign out" button
- **Loading state:** "Loading…" centered; empty state "First page not written yet"
- **Quirk:** `today` is computed as `new Date().toISOString().slice(0,10)` — UTC date. The backend's `/entries/today` uses server-local `date.today()`. These can disagree if the server is not in UTC.

---

#### `WritePage.tsx`

- **Renders:** header (← back, date, Save button); three write blocks (DAY / MIND / TOMORROW) with auto-resizing textareas; image zone (dashed upload button + preview grid)
- **Route params:** `id` optional — if present, loads existing entry for edit
- **API calls on load:** `GET /entries/:id` (only if `id` present)
- **Save sequence:**
  1. Validate all three fields non-empty; show toast if not
  2. If new: `POST /entries` → get `entryId`
  3. If edit: `PUT /entries/:id`
  4. Serial: `DELETE /entries/:entryId/images/:imgId` for each image marked for deletion
  5. Serial: `POST /entries/:entryId/images` for each new file
  6. Invalidate TanStack Query caches `['entries']` and `['entry', entryId]`
  7. Show "Entry saved" toast, navigate to "/"
- **Image state:** `existingImages` (loaded from API), `newFiles` (File[] for pending uploads), `toDelete` (Set of IDs marked for removal)
- **Error state:** shows toast "Failed to save. Try again." on any error
- **Known quirk:** `URL.createObjectURL(file)` called inside JSX render on every render cycle — blob URLs never revoked (memory leak)
- **Known quirk:** `today = new Date().toISOString().slice(0,10)` computed once on mount; stale if app stays open past midnight

---

#### `ReadPage.tsx`

- **Renders:** header (← back, date, 🗑 delete button); read body with Day (ImageFlow), Mind (thought-card), Tomorrow (tomorrow-card)
- **API calls:** `GET /entries/:id` via TanStack Query
- **Delete flow:** native `window.confirm()` dialog → `DELETE /entries/:id` → invalidate queries → navigate to "/"
- **Loading state:** "Loading…" centered while `isLoading || !entry`
- **Note:** `ImageFlow` only wraps `entry.day_text`; thought and tomorrow sections have custom card styling

---

### Shared components

#### `ProtectedRoute.tsx`

- **Props:** `children: React.ReactNode`
- **Behavior:** reads `accessToken` from authStore; if null → `<Navigate to="/login" replace />`; otherwise renders children
- **Limitation:** only checks token presence, not validity. A stored but expired token passes this guard; the axios interceptor handles the actual refresh.

---

#### `ImageFlow.tsx`

- **Props:** `images: {url: string}[]`, `text: string`
- **Behavior:**
  - 0 images → `<div class="image-flow"><p>{text}</p></div>`
  - ≤ 2 sentences (short text) → all images floated before the full paragraph
  - ≥ 3 sentences → split text into N+1 groups, inject `FloatImage` before each group after the first
- **Shape cycle** (index % 5):

| Index | Class | Float | Shape | Size |
|-------|-------|-------|-------|------|
| 0 | `fi-circle-r` | right | circle | 110 px |
| 1 | `fi-circle-l` | left | circle | 96 px |
| 2 | `fi-square-r` | right | rounded square | 130 px |
| 3 | `fi-circle-l` | left | circle | 100 px |
| 4 | `fi-square-l` | left | rounded square | 118 px |

- **Sentence splitting:** `text.split(/(?<=[.!?…])\s+/)` — lookbehind on punctuation + whitespace
- **Group sizing:** `groupSize = sentences.length / (N+1)`; each sentence goes to `groups[Math.min(floor(i/groupSize), N)]`
- **Critical constraint:** the parent `.image-flow` must use block layout (never flexbox). CSS `float` + `shape-outside` requires in-flow block children. Flexbox removes floats from flow, breaking the layout entirely.
- **CSS:** `.image-flow::after { content:''; display:table; clear:both }` — clearfix for the float container

---

#### `Toast.tsx`

- **Props:** none (reads from `useToastStore`)
- **Renders:** `<div class="toast [show]">{message}</div>` — always in DOM, CSS-animated
- **Behavior:** `show` class added/removed; CSS `opacity` + `translateY` transition; pointer-events none

---

### `api/client.ts` — axios setup

```
BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

imgUrl(path) = path.startsWith('http') ? path : BASE_URL + path

client = axios.create({ baseURL: BASE_URL })
```

**Request interceptor:** reads `useAuthStore.getState().accessToken`; adds `Authorization: Bearer <token>` if present.

**Response interceptor (401 handling):**

```
if status !== 401 or request already retried → pass through

if no refreshToken in store → clear() + redirect /login

if already refreshing (isRefreshing = true):
  queue a promise; resolve it when refresh completes; retry original with new token

else:
  set _retry = true, isRefreshing = true
  POST /auth/refresh with refreshToken
  on success: setTokens(new_access, new_refresh)
              drain refreshQueue (each cb receives new access_token)
              retry original request
  on failure: clear() + redirect /login
  finally: isRefreshing = false
```

The `isRefreshing` flag + `refreshQueue` pattern correctly handles parallel requests that all 401 simultaneously: the first one triggers the refresh; the rest queue and are replayed when it resolves.

---

### `authStore.ts` — Zustand slice

| Key | Type | Initial value | localStorage key |
|-----|------|---------------|------------------|
| `accessToken` | `string \| null` | `localStorage.getItem('memoir_access_token')` | `memoir_access_token` |
| `refreshToken` | `string \| null` | `localStorage.getItem('memoir_refresh_token')` | `memoir_refresh_token` |
| `user` | `{id, email} \| null` | `null` | not persisted |

Actions: `setTokens(access, refresh)` — sets both store and localStorage; `setUser(user)`; `clear()` — removes localStorage keys, nulls all three.

`user` is not persisted to localStorage — it is always re-fetched from `/auth/me` on app boot (in `App.tsx`'s `useEffect`).

---

### Design tokens (CSS variables)

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | `#07090f` | Page/body background |
| `--b1` | `#0d1117` | Card / calendar card background |
| `--b2` | `#131920` | Input background, hover background |
| `--b3` | `#1c2530` | Borders, muted backgrounds |
| `--tx` | `#eaecf2` | Primary text |
| `--t2` | `#7a869c` | Secondary text |
| `--t3` | `#4b5468` | Muted text, placeholders |
| `--va` | `#545f8f` | Muted indigo/slate accent — decorative borders, badges, focus states |
| `--vb` | `#6b76a8` | Lighter muted accent |
| `--vc` | `#8990c2` | Lightest muted accent (block badge text) |
| `--acc` | `#2bd9b0` | The one neon accent, reserved for functional "live" signals only: streak number, week/calendar entry dots, pulse-dot, save confirmation |
| `--ga` | `#3c4470` | Primary gradient start (muted indigo) |
| `--gb` | `#565f96` | Primary gradient mid (currently unused directly) |
| `--gc` | `#6b74ac` | Primary gradient end (muted slate-blue) |
| `--g` | `linear-gradient(135deg, var(--ga), var(--gc))` | Primary gradient (logo, FAB, buttons, section divider) |
| `--gw` | `linear-gradient(135deg, #6b4a45, #453a5e)` | Secondary gradient — tomorrow/notes card only (muted terracotta → plum) |
| `--safe-top` | `env(safe-area-inset-top, 0px)` | iOS notch padding |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | iOS home indicator padding |

Note: the accent used to be teal/indigo (`--va: #00c9b1`, `--g: #00c9b1 → #6366f1`) before this pass, and *never* matched the violet/pink values previously documented here — that was stale documentation, not a real historical palette. The current palette intentionally moves away from a single loud gradient smeared across many elements, toward a muted indigo/slate base with `--acc` reserved for a handful of functional indicators.

**Fonts (Google Fonts CDN):**
- `Unbounded` (wght 400/600/700) — headings, logo, dates, badges. Confirmed to carry real Cyrillic glyphs (including Ё/Й) via Google's own served `unicode-range`.
- `Golos Text` (wght 400/500/600) — body text, inputs, buttons, textareas. Replaces `Outfit`, which has **no Cyrillic glyphs in any weight** (confirmed via Google Fonts CSS2 response — only latin/latin-ext/vietnamese ranges are ever served for it), causing Cyrillic characters to silently fall back to the system sans-serif mid-sentence. Golos Text was designed by VK specifically for Cyrillic/Latin visual harmony in product UI.
- `Caveat` (wght 500/600) — decorative quote mark, tomorrow/notes card mark. Has real Cyrillic glyphs.

---

### PWA setup

`index.html` meta tags:
- `apple-mobile-web-app-capable: yes` — enables standalone mode on iOS
- `apple-mobile-web-app-status-bar-style: black-translucent` — status bar overlays the app
- `apple-mobile-web-app-title: Memoir` — home screen label
- `theme-color: #07060C`
- `viewport: width=device-width, initial-scale=1.0, viewport-fit=cover` — extends content into safe areas

`manifest.json`:
- `display: standalone` — hides browser chrome
- `background_color / theme_color: #07060C`
- `orientation: portrait`
- Icons: 192×192 and 512×512 PNG

CSS handles safe areas via `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` on page headers. Body uses `-webkit-fill-available` height for correct iOS viewport.

**No service worker** — the app is a PWA by manifest only. There is no offline support or asset caching.

---

## Data flow diagrams

### Auth lifecycle

```
 App boot
    │
    ├─ localStorage has tokens?
    │        │
    │       YES → GET /auth/me ──── 200 ──► setUser(me) → render app
    │       │                  └── 401 ──► try refresh (see below)
    │       NO  ──────────────────────────────► redirect /login
    │
 User submits login form
    │
    └─► POST /auth/login
              │
             200 ──► setTokens(access, refresh) → GET /auth/me → setUser → navigate /
             401 ──► show "Invalid email or password"

 Any API request → 401 (access token expired)
    │
    ├─ no refreshToken in store? ──► clear() + redirect /login
    │
    ├─ already refreshing?  ──► queue promise
    │
    └─► POST /auth/refresh
              │
             200 ──► setTokens(new_access, new_refresh)
                     drain queue (replay queued requests with new token)
                     retry original request
             401 ──► clear() + redirect /login

 User clicks "Sign out"
    │
    └─► clear() (removes localStorage + nulls store) → navigate /login
```

---

### Entry create with image upload

```
 User on WritePage (new entry, fills 3 blocks, selects 2 photos)
    │
    └─► handleSave()
           │
           ├── validate: all 3 fields non-empty
           │        └── fails ──► showToast("Please fill in all three sections")
           │
           ├── POST /entries {date, day_text, thought_text, tomorrow_text}
           │        └── 201 ──► entryId = res.data.id
           │            409 ──► (duplicate date — shouldn't happen from UI)
           │
           ├── (toDelete is empty for new entry — skip)
           │
           ├── POST /entries/:entryId/images  ← file 1 (serial, not parallel)
           │        └── 201 ──► image saved to disk + DB
           │
           ├── POST /entries/:entryId/images  ← file 2
           │        └── 201
           │
           ├── queryClient.invalidateQueries(['entries'])
           ├── queryClient.invalidateQueries(['entry', entryId])
           ├── showToast("Entry saved")
           └── navigate('/')
```

---

### App boot / token hydration

```
 index.html loads
    │
    └─► main.tsx: ReactDOM.createRoot → render <QueryClientProvider><App /></QueryClientProvider>
           │
           └─► App.tsx: useAuthStore initializes from localStorage
                           (accessToken and refreshToken read synchronously)
                        createBrowserRouter renders current route
                        useEffect([]) fires after first render:
                           if accessToken:
                               GET /auth/me
                                  200 ──► setUser(me data)
                                  err  ──► clear() (no redirect here — ProtectedRoute handles it)
                           else: skip (ProtectedRoute redirects to /login if needed)
```

---

## Environment variables

### Backend

| Variable | Type | Required | Example | Consumed by |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | `str` | Yes | `postgresql+asyncpg://memoir:secret@host:5432/memoir` | `config.py` → `database.py`, `alembic/env.py` |
| `SECRET_KEY` | `str` | Yes | 64-char random hex | `config.py` → `services/auth.py` |
| `CORS_ORIGINS` | `list[str]` (JSON) | Yes | `["https://memoir.qear.net"]` | `config.py` → `main.py` CORS middleware |
| `UPLOAD_DIR` | `str` | No | `uploads` | `config.py` → `image_service.py`, `main.py` StaticFiles |
| `APP_NAME` | `str` | No | `Memoir API` | FastAPI title |
| `DEBUG` | `bool` | No | `false` | SQLAlchemy echo, FastAPI debug |
| `ALGORITHM` | `str` | No | `HS256` | JWT sign/verify |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | No | `30` | Token creation |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `int` | No | `30` | Token creation |

### Frontend

| Variable | Type | Required | Example | Consumed by |
|----------|------|----------|---------|-------------|
| `VITE_API_URL` | `str` | Yes (prod) | `https://memoir-api.qear.net` | `api/client.ts` BASE_URL; `imgUrl()` |

`VITE_API_URL` is baked into the JS bundle at build time (Vite replaces `import.meta.env.VITE_API_URL`). It defaults to `http://localhost:8000` if not set.

---

## Local development

### Setup

```bash
# 1. Copy backend env
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY to anything for local use

# 2. Start all services
docker-compose up --build 

# Backend API:    http://localhost:8000
# Frontend app:   http://localhost:5173
# Swagger UI:     http://localhost:8000/docs
# ReDoc:          http://localhost:8000/redoc
```

### Docker-compose services

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `postgres` | `postgres:16-alpine` | 5432 | healthcheck via `pg_isready`; named volume `pgdata` |
| `backend` | `./backend/Dockerfile` | 8000 | waits for postgres healthy; named volume `uploads` |
| `frontend` | `./frontend/Dockerfile` | 5173→80 | build arg `VITE_API_URL=http://localhost:8000` |

### Running tests

```bash
cd backend

# Install deps (use venv)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install aiosqlite  # not in requirements.txt — needed for SQLite test fixtures

# Run all tests
pytest

# Run a specific file
pytest tests/test_auth.py -v
```

Tests use `sqlite+aiosqlite://` in-memory DB. Each test gets an isolated session via the `db_session` fixture.

---

## Deployment architecture

### Infrastructure

```
Cloudflare DNS
  *.qear.net  A  →  Hetzner VPS IP

Hetzner VPS (8 GB RAM)
  └── Coolify v4  (https://coolify.qear.net)
        └── Project: MEMOir
              └── Environment: production
                    ├── memoir-postgres    postgres:16-alpine
                    ├── memoir-backend     custom Dockerfile
                    └── memoir-frontend    custom Dockerfile
```

### Services

| Service | Base image | Domain | Port | Notes |
|---------|------------|--------|------|-------|
| `memoir-postgres` | `postgres:16-alpine` | internal only | 5432 | data at Coolify-managed volume |
| `memoir-backend` | `python:3.12-slim` (via Dockerfile) | `memoir-api.qear.net` | 8000 | persistent volume mounted at `/app/uploads` |
| `memoir-frontend` | `nginx:alpine` (via multi-stage) | `memoir.qear.net` | 80 | build arg `VITE_API_URL=https://memoir-api.qear.net` |

### Backend env vars (production)

```
DATABASE_URL=postgresql+asyncpg://user:pass@memoir-postgres:5432/memoir
SECRET_KEY=<long random string>
CORS_ORIGINS=["https://memoir.qear.net"]
UPLOAD_DIR=uploads
DEBUG=false
```

### Auto-deploy

Every push to `master` triggers Coolify to rebuild and redeploy both services.

### Migration-on-boot

```dockerfile
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

Migrations run on every container start before uvicorn. If migration fails, the container exits (correct behavior).

**Note:** `main.py` also calls `init_db()` (`create_all`) on startup, which runs in parallel with alembic migration tracking. These can diverge over time.

---

## Known issues & tech debt

| Issue | Risk | Fix | Effort |
|-------|------|-----|--------|
| No rate limiting on auth endpoints | High — credential stuffing, brute force on `/login` | Add `slowapi` with `RateLimiter` dependency; 5 req/min per IP on `/auth/login` and `/auth/register` | ~2 h |
| Swagger UI exposed in production | Medium — reveals full API schema, enables easy fuzzing | Pass `docs_url=None, redoc_url=None` to `FastAPI()` in production, or gate behind auth | 15 min |
| Refresh tokens not stored in DB | Medium — logout doesn't invalidate tokens; stolen refresh token valid for 30 days | Store refresh token hash in DB; delete on `/logout`; validate presence on `/refresh` | ~4 h |
| No DB backups configured | High — single VPS, no point-in-time recovery | Enable Coolify scheduled backups or add `pg_dump` cron to S3 | 1 h |
| Hardcoded seed user (`admin@memoir.app` / `***REMOVED***`) | High — ships a known credential in production | Remove `seed_default_user()` from lifespan; create user via migration or one-time script | 30 min |
| `backend/.env` committed to git | Medium — leaks dev secrets; sets bad precedent | Add `.env` to `.gitignore`; rotate any reused secrets | 10 min |
| `memoir.db` (SQLite file) committed | Low — leftover artifact, no prod secrets | Add `*.db` to `.gitignore`; delete from git history | 10 min |
| Pillow/WebP not implemented | Low (functional) / Medium (storage) — README claims WebP compression but images are stored raw at original size | Add `Pillow` to `requirements.txt`; implement resize + WebP conversion in `image_service.save_image` | ~2 h |
| `init_db()` + alembic both on startup | Low-Medium — can silently diverge schema; `create_all` bypasses migration version tracking | Remove `await init_db()` from lifespan; rely solely on alembic | 15 min |
| `aiosqlite` missing from `requirements.txt` | Low — tests fail for anyone who installs deps from `requirements.txt` | Add `aiosqlite` to `requirements.txt` (or a `requirements-test.txt`) | 5 min |
| `002_entries_images.py` is a no-op migration | Low — dead code, confusing history | Remove the file or replace with a meaningful schema change | 10 min |
| `calculate_streak` loads all dates into memory | Low (current scale) / Medium (long-term) — O(N) memory for a single streak query | Rewrite as a recursive CTE or window function in SQL | ~1 h |
| Content-type spoofing on image upload | Medium — attacker sets `content-type: image/jpeg` on arbitrary file | Use `python-magic` or read file header bytes to validate MIME type | 1 h |
| No password minimum length | Low-Medium — allows empty/1-char passwords | Add `Field(min_length=8)` to `RegisterRequest.password` | 5 min |
| `WritePage` blob URL leak | Low — `URL.createObjectURL` called on every render, never revoked | Use `useEffect` with `URL.revokeObjectURL` cleanup | 30 min |
| Vite proxy misconfigured | Low — `vite.config.ts` proxies `/api` but app uses `/auth`, `/entries` directly; proxy never fires | Remove dead proxy config or prefix all routes with `/api` | 5 min |
| `today` stale after midnight in WritePage | Low — entry date wrong if app open across midnight | Move `today` into state or recompute in `handleSave` | 15 min |
| `date.today()` is server-local in `/entries/today` | Low — disagreement between client UTC date and server date in non-UTC timezone | Accept `date` query param, or ensure server runs in UTC | 30 min |
| `health.py` typo: `"memoir-ap"` | Cosmetic | Change to `"memoir-api"` | 1 min |
| `updated_at` has both `onupdate` and manual set | Cosmetic — redundant but harmless | Remove either the `onupdate` kwarg from the model or the `entry.updated_at = datetime.utcnow()` line in the service | 5 min |

---

## What's missing / next steps

### Phase 6 — LLM reflect endpoint (spec)

**Goal:** Given an entry, call Claude to generate a short reflection on what the user wrote.

**Endpoint:**
```
POST /entries/{entry_id}/reflect
Authorization: Bearer <access_token>
Response 200: {"reflection": "<string>"}
```

**Prompt design:**

```python
SYSTEM = """\
You are a thoughtful journaling companion. Read the user's daily entry and write a single short paragraph (3–4 sentences) of genuine reflection. Focus on patterns, tensions, or themes you notice. Be warm but not saccharine. Do not give advice unless asked.\
"""

USER = """\
<day>{day_text}</day>
<mind>{thought_text}</mind>
<tomorrow>{tomorrow_text}</tomorrow>
"""
```

**XML injection guard:** wrap each field value individually in XML tags (already shown above). Sanitize by stripping `</` sequences from user content before interpolation:

```python
def sanitize(s: str) -> str:
    return s.replace("</", "< /")
```

**Implementation sketch:**

```python
# routes/reflect.py
from anthropic import AsyncAnthropic

@router.post("/entries/{entry_id}/reflect")
async def reflect(entry_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    entry = await entry_service.get_entry_by_id(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(404)

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        system=SYSTEM,
        messages=[{"role": "user", "content": USER.format(
            day_text=sanitize(entry.day_text or ""),
            thought_text=sanitize(entry.thought_text or ""),
            tomorrow_text=sanitize(entry.tomorrow_text or ""),
        )}],
    )
    return {"reflection": message.content[0].text}
```

**New env var:**

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `ANTHROPIC_API_KEY` | `str` | Yes (Phase 6) | `sk-ant-...` |

Add to `config.py`:
```python
ANTHROPIC_API_KEY: str | None = None
```

Add `anthropic` to `requirements.txt`.

**Response schema:**
```python
class ReflectResponse(BaseModel):
    reflection: str
```

**Gaps spotted while reading code:**
- No loading state on the frontend for reflect — will need a spinner and error handling
- Reflection should probably not be stored (ephemeral) or optionally stored in a new `reflections` table
- Rate limiting is especially important here (each call = LLM cost)
- Empty entry fields should be handled gracefully (entry might have no `day_text`)

---

## Code review findings

| # | File | Location | Severity | Description | Suggested fix |
|---|------|----------|----------|-------------|---------------|
| 1 | `image_service.py` | `save_image()` | **High** | Pillow/WebP conversion is not implemented. Files are saved with their original extension and raw bytes. `Pillow` is not in `requirements.txt`. All README/CLAUDE.md references to "WebP compression" are false. | Add `Pillow` to `requirements.txt`; open with `PIL.Image.open(io.BytesIO(data))`; resize to max 1200 px; `img.save(dest, "WEBP", quality=80)` |
| 2 | `main.py` | `seed_default_user()` | **High** | Hardcoded credential `admin@memoir.app` / `***REMOVED***` is seeded on every boot if it doesn't exist. Anyone who knows this default can log in to any fresh deployment. | Remove the seed function entirely; create the initial user via a one-time migration or a `POST /auth/register` call at setup |
| 3 | `backend/.env` | repo root | **High** | The actual `.env` file (with `SECRET_KEY`) is committed to the git repository. | Add `backend/.env` to `.gitignore`; rotate any secrets that have been pushed remotely |
| 4 | `config.py` | `SECRET_KEY` default | **Medium** | Default value `"change-me-in-production"` ships in code with no startup check that it has been replaced. | Add a `@model_validator(mode='after')` that raises if `SECRET_KEY == "change-me-in-production"` and `DEBUG == False` |
| 5 | `image_service.py` | `save_image()` | **Medium** | Content-type validation only checks the client-supplied `file.content_type` string. An attacker can upload an executable or HTML file by spoofing `content-type: image/jpeg`. | Read the first ~12 bytes of `data` and check magic bytes (or use `python-magic`) |
| 6 | `routes/auth.py` | `register()` | **Medium** | No minimum password length. The schema accepts `password: str` with no `min_length`, allowing 1-character or empty passwords after stripping. | Add `Field(min_length=8)` to `RegisterRequest.password` |
| 7 | `main.py` | `lifespan()` | **Medium** | `await init_db()` calls `Base.metadata.create_all` in addition to `alembic upgrade head` in the Dockerfile CMD. On a clean database, `create_all` creates tables without recording alembic revisions, so `alembic_version` shows no applied migrations; running `alembic upgrade head` then errors or no-ops. On an existing database, `create_all` is harmless but diverges if a migration drops a column. | Remove `await init_db()` from lifespan; rely solely on alembic for schema management |
| 8 | `services/entry_service.py` | `delete_entry()` | **Medium** | Deleting an entry via `await db.delete(entry)` cascades the DB `images` rows (via `cascade="all, delete-orphan"`) but does **not** delete image files from disk. `image_service.delete_image` is never called from the delete_entry path. | In `routes/entries.py` `delete_entry` handler, load `entry.images` and call `await image_service.delete_image(db, img)` for each before deleting the entry, or add disk cleanup to `entry_service.delete_entry` |
| 9 | `main.py` | `FastAPI(debug=settings.DEBUG)` | **Medium** | Swagger UI (`/docs`) and ReDoc (`/redoc`) are accessible in production. `DEBUG` controls SQLAlchemy echo and FastAPI debug mode but does not disable the docs. | Pass `docs_url=None, redoc_url=None` to `FastAPI()` when `not settings.DEBUG` |
| 10 | `entry_service.py` | `calculate_streak()` | **Low** | Loads all `Entry.date` rows for a user into Python memory to compute the streak. Unbounded query — will degrade as entries accumulate. Streak is also recomputed on every `GET /entries` call. | Replace with a SQL recursive CTE or compute streak only on demand via a dedicated endpoint |
| 11 | `tests/conftest.py` | `db_session` fixture | **Low** | Tests use `sqlite+aiosqlite://` but `aiosqlite` is not in `requirements.txt`. Tests will fail for anyone who installs only from `requirements.txt`. | Add `aiosqlite` to `requirements.txt` or a separate `requirements-test.txt`; add test instructions to README |
| 12 | `WritePage.tsx` | `img-preview-grid` render | **Low** | `URL.createObjectURL(file)` is called inside JSX (in the render path), creating a new blob URL on every re-render. These are never revoked, leaking memory proportional to re-render count. | Store blob URLs in state/ref via `useEffect`; call `URL.revokeObjectURL` on cleanup |
| 13 | `vite.config.ts` | `server.proxy` | **Low** | The vite dev proxy maps `/api` → `http://localhost:8000`, but the frontend calls `/auth`, `/entries`, `/health` directly — not under `/api`. The proxy never fires. | Remove the dead proxy entry, or update all API paths to `/api/*` (requires corresponding backend router prefix change) |
| 14 | `alembic/versions/002_entries_images.py` | `upgrade()` | **Low** | The migration body is `pass`. It exists only to extend the chain from `441fa6562f08` but does nothing. Confusing and clutters migration history. | Remove the file and update `441fa6562f08` `down_revision` logic; or replace with a meaningful schema operation |
| 15 | `health.py` | response body | **Cosmetic** | `"service": "memoir-ap"` — missing `i`. | Change to `"memoir-api"` |
| 16 | `WritePage.tsx` | `const today` | **Low** | `today = new Date().toISOString().slice(0,10)` is computed once at component mount. If the user keeps the page open past midnight, `today` is stale and new entries are created with yesterday's date. | Compute `today` inside `handleSave()` instead of at render time |
| 17 | `entry_service.py` | `get_today_entry()` | **Low** | Uses `date.today()` (server local time). If the server timezone is not UTC and the client is on UTC, the "today" endpoint may return the wrong entry. | Ensure the server runs in UTC (`TZ=UTC` in container), or accept a `date` query parameter from the client |
| 18 | `authStore.ts` | store initialization | **Low** | `accessToken` and `refreshToken` are read synchronously from `localStorage` during module load (Zustand `create` call). On platforms that block `localStorage` (private browsing in some browsers, or cookie restrictions), this throws and the store fails to initialize. | Wrap `localStorage.getItem` calls in try/catch |
| 19 | `ReadPage.tsx` | `handleDelete` | **Low** | Uses `window.confirm()` for delete confirmation. This native dialog is blocked in some embedded contexts (iframes, some PWA shells) and cannot be styled. | Replace with a custom modal confirmation dialog (same pattern as the info modal in `HomePage.tsx`) |
| 20 | `entry.py` | `updated_at` column | **Cosmetic** | Has both `onupdate=lambda: datetime.utcnow()` on the SQLAlchemy column and a manual `entry.updated_at = datetime.utcnow()` in `update_entry()`. The `onupdate` hook on async ORM sessions may not fire consistently (it fires on Core UPDATE, not always on ORM unit of work). The manual set is correct; the `onupdate` kwarg is misleading. | Remove `onupdate` from the model column definition; keep the manual set in the service |
