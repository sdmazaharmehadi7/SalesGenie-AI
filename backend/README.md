# SalesGenie AI — Backend

FastAPI backend for the AI Sales Assistant & Lead Intelligence Platform.

## Stack

Python 3.12 · FastAPI · PostgreSQL · SQLAlchemy 2.0 (async) · Alembic ·
Pydantic v2 · JWT (python-jose) · Passlib (bcrypt)

## Status

**Module 1: Core Infrastructure — complete.**
Auth, Leads, Intelligence, Outreach, Scoring, Conversations, and Dashboard
modules are implemented incrementally on top of this foundation.

## Local setup

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

cp .env.example .env
# edit .env — set SECRET_KEY at minimum (openssl rand -hex 32)
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
alembic revision --autogenerate -m "message"
alembic upgrade head
```

### Tests

```bash
pytest
```

## Project layout

```
app/
├── main.py              # app factory, middleware, router mounting
├── core/                 # config, logging, security (JWT/hashing), exceptions
├── db/                   # engine/session, declarative base
├── models/                # SQLAlchemy ORM models (added per module)
├── schemas/                # Pydantic v2 schemas
├── api/
│   ├── deps.py            # shared dependencies (DB session, pagination, auth)
│   └── v1/
│       ├── router.py       # aggregates all versioned routes
│       └── endpoints/      # one file per resource
└── middleware/             # request logging
```
