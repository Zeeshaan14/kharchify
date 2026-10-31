# Kharchify — web app

Next.js (App Router) + TypeScript, Tailwind v4, TanStack Query, Recharts, Motion. UI only: all data comes from the FastAPI backend (`../backend`).

```bash
npm install                 # local only — nothing global
copy .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev                 # http://localhost:3000
```

- `npm run build` type-checks and builds; `npx eslint src` lints.
- Point `NEXT_PUBLIC_API_URL` at a local backend (`http://localhost:8000`) or the live one (`https://kharchify.vercel.app`). The backend must allow this origin in `CORS_ORIGINS`.
- For UI work without touching real data, run the backend on SQLite and seed it: see `backend/scripts/seed_demo.py`.

Screens: Overview (safe-to-spend, budget ring, trend, category donut), Calendar (spending heat-map, tap a day), Expenses (search, filters, infinite list), Budgets, Settings (categories, Shortcut tokens, theme).
