# Deploying the backend (free): Vercel + Neon

```
iPhone Shortcut / browser ──HTTPS──▶ Vercel (FastAPI function, Singapore) ──▶ Neon (PostgreSQL, Singapore)
```

- Vercel runs FastAPI as a serverless function. No 15-minute sleep: after a quiet period the first request takes ~1–3 s, then it's fast. No keep-awake pinger needed.
- Every push to `main` redeploys. Production deploys run database migrations during the build (`backend/scripts/vercel_build.py`); preview deploys don't.
- Config lives in `backend/vercel.json`; Python version in `backend/.python-version`.

## 1. Create the Vercel project
1. Sign up at https://vercel.com with GitHub (Hobby plan, free).
2. **Add New… → Project** → import the `kharchify` repo.
3. **Root Directory** → **Edit** → choose `backend`. Framework should show **FastAPI**.
4. **Environment Variables** — add:
   | Name | Value |
   |---|---|
   | `SECRET_KEY` | a long random string — generate on your laptop from `backend/`:<br>`.venv/Scripts/python -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `ALLOW_REGISTRATION` | `true` |
5. **Deploy.** The first deploy **will fail** with `Missing environment variables: DATABASE_URL` — expected, the database comes next.

## 2. Add the database (Neon, from inside Vercel)
1. In the project: **Storage** tab → **Create Database** → **Neon** (Postgres).
2. Region **Singapore** (closest to the Vercel function) → plan **Free** → Create.
3. **Connect** it to the `kharchify` project (Production, and Preview if offered).
   This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically — never paste them into chat, code, or GitHub.

## 3. Redeploy and check
1. **Deployments** tab → latest → **⋯ → Redeploy**.
2. Build logs should show `Running upgrade -> …, initial schema`.
3. Your URL is on the project page, e.g. `https://kharchify-api.vercel.app`:
   - `https://<your-url>/health` → `{"status":"ok"}`
   - `https://<your-url>/docs` → API docs

## 4. Create your account, then lock registration
1. In `/docs`: **POST /auth/register** with your email, name, password.
2. **Settings → Environment Variables** → set `ALLOW_REGISTRATION` to `false` → Save → **Redeploy**.
   Now nobody else can sign up on your server.

## 5. Connect the iPhone Shortcut
Follow [iphone-shortcut.md](iphone-shortcut.md) from **Step 1**, with `https://<your-url>` as the API URL. Works on Wi-Fi and mobile data.

## Notes
- **Use the production URL** (`<project>.vercel.app`). Preview URLs (per branch/commit) are login-protected by Vercel and use the same database without migrating it.
- **Logs / errors:** project → **Logs** (runtime) or the deployment's **Build Logs**.
- **Database viewer:** Storage tab → Neon → **Open in Neon Console** → **Tables**.
- **Free limits:** Hobby plan is for personal, non-commercial use; Neon free gives 0.5 GB — years of expenses.
- **Your laptop still uses SQLite** — local and hosted data are separate.
