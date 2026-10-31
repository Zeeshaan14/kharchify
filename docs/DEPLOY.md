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
Follow [iphone-shortcut.md](iphone-shortcut.md), with `https://<your-url>` as the API URL. Works on Wi-Fi and mobile data.

## 6. Deploy the web app (second Vercel project)
The same repo holds both apps; the web app is its own Vercel project with root `frontend`.
1. Vercel → **Add New… → Project** → import `kharchify` **again**.
2. **Project Name** e.g. `kharchify-app` (gives `https://kharchify-app.vercel.app`).
3. **Root Directory** → `frontend`. Framework: **Next.js** (auto-detected).
4. **Environment Variables:** `NEXT_PUBLIC_API_URL` = `https://<your-api-url>` (the backend URL, no trailing slash).
5. **Deploy.**
6. Allow the web app to call the API — in the **backend** project: **Settings → Environment Variables** →
   `CORS_ORIGINS` = `["https://kharchify-app.vercel.app","http://localhost:3000"]` (JSON list, your real web-app URL) → Save → **Redeploy** the backend.
7. Open the web app URL and sign in.

Optional: the login lasts `ACCESS_TOKEN_EXPIRE_MINUTES` (default 10080 = 7 days). For fewer re-logins on your phone set it to e.g. `43200` (30 days) in the backend project and redeploy.

Both projects redeploy on every push. To skip a project's build when only the other folder changed: project → **Settings → Build and Deployment → Ignored Build Step** → "Only build if there are changes in a folder" (its root directory).

## 7. Install on iPhone
Open the web app in **Safari** → **Share** → **Add to Home Screen** → **Add**. It opens full-screen like an app. Sign in once inside it (the home-screen app keeps its own login, separate from Safari).

## Notes
- **Use the production URL** (`<project>.vercel.app`). Preview URLs (per branch/commit) are login-protected by Vercel and use the same database without migrating it.
- **Logs / errors:** project → **Logs** (runtime) or the deployment's **Build Logs**.
- **Database viewer:** Storage tab → Neon → **Open in Neon Console** → **Tables**.
- **Free limits:** Hobby plan is for personal, non-commercial use; Neon free gives 0.5 GB — years of expenses.
- **Laptop data:** with no `DATABASE_URL` in `backend/.env` the laptop uses its own SQLite file; if `.env` points at the Neon URL, the laptop works on your **live** data.
