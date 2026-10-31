"""Fill a LOCAL SQLite database with a demo user and two months of sample spending, for UI work.

Run from backend/ against a dev server that uses SQLite, e.g.:
    DATABASE_URL=sqlite:///./kharchify.db ALLOW_REGISTRATION=true .venv/Scripts/python -m uvicorn app.main:app
    DATABASE_URL=sqlite:///./kharchify.db .venv/Scripts/python scripts/seed_demo.py

Demo login: demo@kharchify.dev / demo12345. Refuses to run unless DATABASE_URL is SQLite,
so it can't write into the production database.
"""

import random
import sys
from datetime import date, timedelta
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings  # noqa: E402

API = "http://localhost:8000"
EMAIL, PASSWORD = "demo@kharchify.dev", "demo12345"

# (category, chance per day, min, max, notes, usual payment method)
PLAN = [
    ("Food", 0.8, 80, 450, ["Swiggy", "Zomato", "Chai & samosa", "Lunch", "Biryani"], "upi"),
    ("Transport", 0.5, 40, 350, ["Uber", "Metro", "Auto", "Rapido"], "upi"),
    ("Groceries", 0.25, 150, 1400, ["Zepto", "BigBasket", "D-Mart"], "upi"),
    ("Shopping", 0.08, 500, 3500, ["Myntra", "Amazon", "Decathlon"], "card"),
    ("Entertainment", 0.07, 200, 900, ["PVR", "Netflix", "Bowling"], "card"),
    ("Health", 0.04, 150, 1200, ["Pharmacy", "Gym"], "upi"),
]


def main() -> None:
    if not settings.database_url.startswith("sqlite"):
        sys.exit("Refusing to seed: DATABASE_URL is not SQLite (is .env pointing at production?)")

    client = httpx.Client(base_url=API)
    client.post("/auth/register", json={"email": EMAIL, "name": "Demo", "password": PASSWORD})
    login = client.post("/auth/login", data={"username": EMAIL, "password": PASSWORD})
    login.raise_for_status()
    client.headers["Authorization"] = f"Bearer {login.json()['access_token']}"
    if client.get("/expenses", params={"limit": 1}).json()["total"]:
        sys.exit("Demo user already has expenses — delete backend/kharchify.db to start over")

    categories = {c["name"]: c["id"] for c in client.get("/categories").json()}

    def add(category: str, amount: int, day: date, method: str, note: str, is_need: bool | None) -> None:
        body = {"amount": str(amount), "category_id": categories[category], "spent_on": day.isoformat(),
                "payment_method": method, "note": note, "is_need": is_need}
        client.post("/expenses", json=body).raise_for_status()

    random.seed(7)
    today = date.today()
    day = (today.replace(day=1) - timedelta(days=1)).replace(day=1)  # first of last month
    count = 0
    while day <= today:
        for category, chance, low, high, notes, method in PLAN:
            if random.random() < chance:
                add(category, random.randrange(low, high) // 10 * 10, day, random.choice([method, method, "cash"]),
                    random.choice(notes), random.choice([True, False, None]))
                count += 1
        if day.day == 5:
            add("Rent", 18000, day, "netbanking", "Rent", True)
            count += 1
        if day.day == 10:
            add("Bills", 1450, day, "upi", "Electricity + WiFi", True)
            count += 1
        day += timedelta(days=1)

    for budget in (
        {"period": "monthly", "amount": "55000"},
        {"period": "daily", "amount": "900"},
        {"period": "monthly", "category_id": categories["Food"], "amount": "8000"},
        {"period": "monthly", "category_id": categories["Shopping"], "amount": "4000"},
        {"period": "monthly", "category_id": categories["Transport"], "amount": "4500"},
    ):
        client.post("/budgets", json=budget).raise_for_status()

    print(f"Seeded {count} expenses and 5 budgets. Log in as {EMAIL} / {PASSWORD}")


if __name__ == "__main__":
    main()
