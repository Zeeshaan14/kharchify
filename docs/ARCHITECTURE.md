# Kharchify — Architecture

Personal expense tracker (INR). Answers: where is my money going, what am I overspending on, am I within budget. Used on laptop and iPhone.

## Decisions
| Topic | Decision |
|---|---|
| Months | Calendar month (1st–last day), in the user's timezone (default `Asia/Kolkata`) |
| Currency | INR only |
| Scope | Expenses only (income later, maybe). No shared/split expenses. No bank balance. |
| Bank / Google Pay sync | Not possible via API. Instead: iPhone Shortcut prompt after closing Google Pay (see `iphone-shortcut.md`). Statement upload is a possible late extra. |
| Dev DB | SQLite file `backend/kharchify.db`. Production: hosted PostgreSQL (Neon). |
| Hosting | Backend on Vercel (serverless FastAPI, no idle sleep; ~1–3 s cold start), chosen over Render (free tier sleeps 15 min, 30–60 s wake). Steps: `DEPLOY.md`. |
| Frontend token storage | Browser storage (start simple). |

## System
```
iPhone / Laptop browser ── Next.js (PWA, Vercel) ──┐
iPhone Shortcut ───────────────────────────────────┤ HTTPS JSON + Bearer token
                                                   ▼
                         FastAPI (Vercel function, sin1) ── PostgreSQL (Neon, Singapore)
```
The frontend never computes money; totals and budget status come from the API so every device shows the same numbers.

## Backend layers
- `routers/` — HTTP only: parse request, call service, return schema.
- `services/` — business logic (validation across tables, budget math, aggregations). Testable without HTTP.
- `models.py` / `schemas.py` / `deps.py` — tables, request/response shapes, shared dependencies.

## Auth
- Email + password → JWT access token (7 days) for the web app.
- **Personal API tokens** (`kh_…`) for the iPhone Shortcut: long-lived, stored as SHA-256 hash, revocable, `last_used_at` tracked. Can do everything except manage tokens (that needs a login session).

## Data model
| Table | Key fields |
|---|---|
| `users` | email, name, hashed_password, timezone |
| `categories` | user_id, name (unique per user, case-insensitive), icon, color, is_archived |
| `expenses` | user_id, category_id, amount NUMERIC(12,2), spent_on (date), payment_method (`upi`/`cash`/`card`/`netbanking`/`other`), note, is_need (nullable) |
| `budgets` | user_id, category_id (NULL = overall), period (`daily`/`monthly`), amount |
| `api_tokens` | user_id, name, token_hash, prefix, created_at, last_used_at |
| later: `recurring_expenses`, `savings_goals` | |

Rules: money is `Decimal`, never `float`. Categories with expenses are archived, not deleted. Every query is scoped to the current user; another user's IDs return 404.

## API
| Module | Endpoints | Phase |
|---|---|---|
| auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | 1 ✅ |
| categories | `GET /categories`, `POST /categories`, `PATCH /categories/{id}` | 2 |
| expenses | `GET /expenses` (filters + pagination), `POST`, `GET/PATCH/DELETE /expenses/{id}` | 2 |
| tokens | `GET /tokens`, `POST /tokens`, `DELETE /tokens/{id}` | 2 |
| budgets | CRUD | 3 |
| dashboard | `GET /dashboard/summary?month=YYYY-MM` | 3 |
| recurring, insights, export | | 5–6 |

## Budgets & dashboard (Phase 3)
- Monthly: spent from the 1st through today vs limit. Daily: today vs limit.
- **Safe to spend today** = (monthly budget − spent this month) ÷ days left including today.
- Status: green < 80%, yellow 80–100%, red > 100%.
- Dashboard = one call: today, month total, remaining, safe-to-spend, by-category breakdown, top 5 expenses, daily trend. Computed with SQL aggregates.
- `POST /expenses` will then also return budget-left info for the Shortcut notification.

## Recurring expenses (Phase 5)
No background scheduler (serverless functions only run per request). Due items are created on demand ("catch-up") when the user next hits the API.

## Roadmap
1. ✅ Backend base + login
2. ✅ Categories, expenses, API tokens, iPhone Shortcut guide; Vercel + Neon deploy setup
3. Budgets + dashboard API
4. Next.js frontend (TanStack Query, Tailwind, Recharts; mobile-first, bottom nav, floating "+ Add")
5. Frontend deploy (Vercel), PWA, recurring expenses
6. Insights, alerts, savings goals, CSV export
7. (Maybe) bank statement upload
