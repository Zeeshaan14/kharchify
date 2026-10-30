# Kharchify

Track where your money goes: log expenses by category, set daily/monthly budgets, and see what you overspend on.

## Backend setup (Windows)

```bash
cd backend
<python 3.13> -m venv .venv     # any Python 3.12+ (Vercel runs 3.13)
.venv/Scripts/python -m pip install -r requirements-dev.txt
copy .env.example .env          # then set SECRET_KEY
.venv/Scripts/python -m alembic upgrade head
.venv/Scripts/python -m uvicorn app.main:app --reload
```

Open http://localhost:8000/docs to try the API. Run tests with `.venv/Scripts/python -m pytest -q`.

## Roadmap
1. ✅ Backend basics — models, login
2. ✅ Categories + expenses API, personal API tokens, iPhone Shortcut ([guide](docs/iphone-shortcut.md)), Vercel deploy setup ([guide](docs/DEPLOY.md))
3. Budgets + dashboard API — daily/monthly limits, safe-to-spend, category breakdown, trends
4. Next.js frontend — login, quick-add, expense list, dashboard
5. Frontend deploy + PWA + recurring expenses
6. Insights, alerts, savings goals, CSV export
7. (Maybe) bank statement upload

Full design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
