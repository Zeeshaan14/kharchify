# Kharchify

Track where your money goes: log expenses by category, set daily/monthly budgets, and see what you overspend on.

## Backend setup (Windows)

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
copy .env.example .env          # then set SECRET_KEY
.venv/Scripts/python -m alembic upgrade head
.venv/Scripts/python -m uvicorn app.main:app --reload
```

Open http://localhost:8000/docs to try the API. Run tests with `.venv/Scripts/python -m pytest -q`.

## Roadmap
1. ✅ Backend basics — models, login
2. Expense API (add / edit / delete / list)
3. Frontend — login, quick-add form, expense list
4. Budgets — daily/monthly limits, remaining amount
5. Dashboard — category breakdown, top expenses, daily trend
6. PWA + deployment
7. Extras — alerts, recurring expenses, month comparison, CSV export, SMS/statement import
