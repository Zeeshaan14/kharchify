"""Vercel build step: apply database migrations on production deploys only.

Preview deploys (from other branches) skip this so they can't change the production schema.
"""

import os
import subprocess
import sys

if os.environ.get("VERCEL_ENV") != "production":
    print("Skipping migrations: not a production deploy")
    sys.exit(0)

env = dict(os.environ)
# Without these the app would silently fall back to dev defaults (SQLite, insecure key).
missing = [name for name in ("DATABASE_URL", "SECRET_KEY") if not env.get(name)]
if missing:
    sys.exit(f"Missing environment variables: {', '.join(missing)} (see docs/DEPLOY.md)")

# The Neon integration provides a direct (non-pooled) URL; schema changes should use it.
if env.get("DATABASE_URL_UNPOOLED"):
    env["DATABASE_URL"] = env["DATABASE_URL_UNPOOLED"]

subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True, env=env)
