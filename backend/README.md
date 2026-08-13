# AI-Powered Sales Forecasting Platform Using Predictive Analytics — Backend

FastAPI backend for the AI Sales Assistant & Lead Intelligence Platform —
a **complete, production-ready implementation** of every module described
in the project's requirements document.

## Stack

Python 3.12 · FastAPI · PostgreSQL · SQLAlchemy 2.0 (async) · Alembic ·
Pydantic v2 · JWT (python-jose) · Passlib (bcrypt) · httpx · aiosmtplib

## Status: feature-complete

| Area | Status |
|---|---|
| Core infrastructure (config, logging, DB, exceptions, CORS, health) | ✅ |
| Users & JWT auth (register/login/refresh/me) + RBAC | ✅ |
| Full ORM model layer (all 8 entities) | ✅ |
| Full Pydantic v2 schema layer | ✅ |
| Repository layer (all entities) | ✅ |
| Service layer (business logic, all modules) | ✅ |
| Lead Management (CRUD, filtering, pagination, ownership scoping) | ✅ |
| Lead Intelligence & Company Analysis (AI) | ✅ |
| Lead Scoring & Recommendation Engine (AI) | ✅ |
| AI Outreach Generation + sending | ✅ |
| Conversation Intelligence (AI summarization) | ✅ |
| Calendar integration (follow-up scheduling) | ✅ |
| CRM integration (Salesforce / HubSpot / mock) | ✅ |
| Sales Analytics Dashboard | ✅ |
| Admin user management | ✅ |
| Alembic migrations (all tables) | ✅ |
| Tests (auth-boundary + validation + AI unit tests) | ✅ |
| Docker / docker-compose | ✅ |

The app runs **fully out of the box with zero external credentials**:
AI, email, and calendar all default to deterministic mock/console
implementations (`AI_PROVIDER=mock`, `EMAIL_PROVIDER=console`,
`CALENDAR_PROVIDER=mock`, `CRM_DEFAULT_PLATFORM=mock`), so you can run
`docker compose up`, hit the docs, and exercise every endpoint before
plugging in a real OpenAI key, SMTP server, Google Calendar token, or
CRM credentials.

## Data model

| Model | Table | Notes |
|---|---|---|
| `User` | `users` | Auth + RBAC (`UserRole`: admin, sales_manager, sales_rep, bdr, revops) |
| `Lead` | `leads` | Central entity; `lead_status` pipeline stage, `deal_value`, `owner_id` |
| `CompanyInsight` | `company_insights` | AI-generated company analysis, 1 lead : many insights |
| `LeadScore` | `lead_scores` | AI-generated qualification score + conversion probability |
| `OutreachCampaign` | `outreach_campaigns` | AI-generated email content + delivery status |
| `SalesInteraction` | `sales_interactions` | Summarized calls/meetings + action items (JSONB) |
| `CRMSyncLog` | `crm_sync_logs` | Audit log of external CRM sync attempts |
| `SalesAnalytics` | `sales_analytics` | Per-user, point-in-time dashboard snapshots |

## API surface (`/api/v1`)

### Auth (`/auth`) — public except `/me`
`POST /register` · `POST /login` · `POST /refresh` · `GET /me`

### Users (`/users`) — admin only
`GET /` · `GET /{user_id}` · `PATCH /{user_id}`

### Leads (`/leads`) — ownership-scoped (see RBAC below)
`POST /` · `GET /` (filter by `status_filter`, `search`, `owner_id`; paginated)
`GET /{lead_id}` · `PATCH /{lead_id}` · `DELETE /{lead_id}` (admin/manager/revops only)

### Company Intelligence (`/leads/{lead_id}/insights`)
`POST /generate` · `GET /latest` · `GET /`

### Lead Scoring (`/leads/{lead_id}/scores`)
`POST /generate` · `GET /latest` · `GET /`

### Outreach (`/leads/{lead_id}/campaigns`)
`POST /generate` · `PATCH /{campaign_id}` · `POST /{campaign_id}/send` · `GET /`

### Conversation Intelligence (`/leads/{lead_id}`)
`POST /interactions/summarize` (AI) · `POST /interactions` (manual) ·
`GET /interactions` · `POST /schedule` (calendar)

### CRM Integration (`/leads/{lead_id}`)
`POST /sync?platform=...` · `GET /sync-history`

### Dashboard (`/dashboard`)
`GET /summary` · `POST /snapshot` · `GET /snapshots`

Full interactive docs at `/api/v1/docs` (Swagger) once running.

## RBAC model

Five roles (`app/models/user.py::UserRole`): `admin`, `sales_manager`,
`sales_rep`, `bdr`, `revops`.

- **Unrestricted** (`admin`, `sales_manager`, `revops`): see and manage
  every lead; can filter the lead list / dashboard by any `owner_id`.
- **Restricted** (`sales_rep`, `bdr`): automatically scoped to leads they
  own — enforced in `LeadService`/`SalesAnalyticsService`, not just the
  router, so it applies uniformly everywhere a lead is read or written.
- Lead **deletion** and all of `/users/*` are further gated to specific
  roles via `Depends(require_roles(...))` in `app/api/deps.py`.

## Integration layer (`app/integrations/`)

Every external dependency is behind an abstract interface with a
provider-agnostic factory, selected via settings — swap providers with
an env var, no code changes:

| Integration | Interface | Providers |
|---|---|---|
| AI (`ai/`) | `AIProvider` | `mock` (default) · `openai` (Chat Completions, JSON mode) |
| Email (`email/`) | `EmailProvider` | `console` (default, logs only) · `smtp` (aiosmtplib) |
| Calendar (`calendar/`) | `CalendarProvider` | `mock` (default) · `google` (Calendar API v3) |
| CRM (`crm/`) | `CRMProvider` | `mock` (default) · `salesforce` · `hubspot` |

The AI layer is the architecture diagram's "Agentic AI Layer" /
"Large Language Model (Gemini/OpenAI)" box: `app/integrations/ai/base.py`
defines the four operations (company insight, lead score, outreach
email, conversation summary) every provider must implement, so a future
LangGraph-based multi-agent implementation is a drop-in replacement
behind the same interface — no service-layer changes required.

## Local setup

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

cp .env.example .env
# edit .env — set SECRET_KEY at minimum (openssl rand -hex 32)
# everything else has safe mock/console defaults for local dev
```

### Run Postgres + API with Docker

```bash
docker compose up --build
```

### Run the API directly (Postgres running separately)

```bash
uvicorn app.main:app --reload
```

- Docs: http://localhost:8000/api/v1/docs
- Health: http://localhost:8000/api/v1/health
- DB health: http://localhost:8000/api/v1/health/db

### Database migrations

```bash
alembic upgrade head
# to add a new migration after changing models:
alembic revision --autogenerate -m "message"
```

Migration history: `0001_create_users_table` → `0002_create_lead_pipeline_tables`
(all remaining entities) → `0003_add_lead_deal_value`.

### Tests

```bash
pytest
```

Covers: auth-boundary checks on every protected route, request
validation, ORM relationship/metadata sanity checks, and pure-logic unit
tests for the mock AI provider. Full CRUD integration tests against a
real Postgres instance are the natural next addition once a test-database
fixture (e.g. `pytest-postgresql` or a dockerized test DB) is wired up.

## Connecting the existing frontend

`BACKEND_CORS_ORIGINS` in `.env` already includes the Vite/CRA dev server
defaults (`http://localhost:5173`, `http://localhost:3000`). Point the
frontend's API base URL at `http://localhost:8000/api/v1` and its auth
flow at `POST /auth/login` (OAuth2 password form: `username` = email,
`password` = password) to get a `{access_token, refresh_token}` pair;
send `Authorization: Bearer <access_token>` on every subsequent request.

## Project layout

```
app/
├── main.py                  # app factory, middleware, router mounting
├── core/                     # config, logging, security (JWT/hashing), exceptions
├── db/                       # engine/session, declarative base
├── models/                    # SQLAlchemy ORM models (all 8 entities)
├── schemas/                    # Pydantic v2 schemas
├── repositories/                # data-access layer, one per entity
├── services/                     # business logic, one per module
├── integrations/                  # AI / email / calendar / CRM provider abstractions
│   ├── ai/
│   ├── email/
│   ├── calendar/
│   └── crm/
├── api/
│   ├── deps.py                     # DB session, pagination, auth/RBAC, integration providers
│   └── v1/
│       ├── router.py                 # aggregates all versioned routes
│       └── endpoints/                 # one file per resource
└── middleware/                         # request logging
alembic/versions/                         # 0001 users -> 0002 pipeline tables -> 0003 deal_value
tests/                                     # auth/validation/model/AI-unit tests
```
