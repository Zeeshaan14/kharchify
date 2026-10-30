# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Kharchify is a personal expense tracker (INR): log expenses by category, set daily/monthly budgets, see where money goes. Used on laptop and phone, so all data lives on the backend.

## Layout
- `backend/` — FastAPI + SQLAlchemy 2.0 + Alembic. SQLite in dev, PostgreSQL planned for deployment.
- `frontend/` — not built yet. Planned: Next.js (App Router) + TypeScript, Tailwind, Recharts, installable as a PWA (no separate native app). Next.js is UI only: all data goes through the FastAPI API — no Next.js API routes or direct DB access.

## Environment rules (strict)
- **Never install anything globally.** Python packages go only into `backend/.venv`; always invoke tools through it: `.venv/Scripts/python -m pip|pytest|alembic|uvicorn ...` (Windows venv layout — `Scripts/`, not `bin/`). Don't rely on an activated shell.
- Frontend: local `npm install` only — no `npm install -g`, no globally installed CLIs.
- Add new Python deps to `backend/requirements.txt`.

## Commands (run from `backend/`)
- Dev server: `.venv/Scripts/python -m uvicorn app.main:app --reload` → API docs at http://localhost:8000/docs
- Tests: `.venv/Scripts/python -m pytest -q` (single: `-k test_name`)
- New migration after changing `app/models.py`: `.venv/Scripts/python -m alembic revision --autogenerate -m "msg"`, review the file, then `.venv/Scripts/python -m alembic upgrade head`

## Conventions
- Money: `Numeric(12, 2)` columns and `Decimal` in Python — never `float`.
- Schema changes only via Alembic migrations; the app never calls `create_all` (tests do, on in-memory SQLite — see `tests/conftest.py`).
- Every query on categories/expenses/budgets must be scoped to the current user (`CurrentUser` dep in `app/deps.py`).
- Config comes from `app/config.py` (pydantic-settings, reads `backend/.env`); see `backend/.env.example`. Alembic reads the DB URL from there too, not `alembic.ini`.
- `POST /auth/login` is an OAuth2 form: the email goes in the `username` field.
- New users get the categories in `app/defaults.py` on register.
- `Budget.category_id = NULL` means an overall budget; `period` is `"daily"` or `"monthly"`.

## Gotchas
- The repo is inside OneDrive; files (e.g. `kharchify.db`) can be locked while syncing, so deletes may fail with "resource busy".
- Stop servers you start by their own PID — never kill all `python.exe`/`node.exe`.
