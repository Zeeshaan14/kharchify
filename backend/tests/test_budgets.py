from decimal import Decimal

import pytest

from app.services.budgets import make_progress
from tests.conftest import add_budget, add_expense, category_id

pytestmark = pytest.mark.usefixtures("frozen_today")


@pytest.mark.parametrize(
    ("spent", "status", "percent"),
    [("0", "ok", 0), ("79.99", "ok", 80), ("80", "warning", 80), ("100", "warning", 100), ("100.01", "over", 100)],
)
def test_progress_status(spent, status, percent):
    progress = make_progress(Decimal("100"), Decimal(spent))
    assert (progress.status, progress.percent) == (status, percent)
    assert progress.remaining == Decimal("100") - Decimal(spent)


def test_monthly_and_daily_progress(client, auth_headers, food_id):
    add_expense(client, auth_headers, food_id, "300", "2026-10-01")
    add_expense(client, auth_headers, food_id, "200")
    add_expense(client, auth_headers, food_id, "999", "2026-09-30")  # last month: not counted

    monthly = add_budget(client, auth_headers, period="monthly", amount="1000")
    daily = add_budget(client, auth_headers, period="daily", amount="250")

    assert monthly["category"] is None
    assert Decimal(monthly["progress"]["spent"]) == Decimal("500")
    assert monthly["progress"]["status"] == "ok"
    assert Decimal(daily["progress"]["spent"]) == Decimal("200")
    assert daily["progress"]["status"] == "warning"


def test_category_budget_counts_only_that_category(client, auth_headers, food_id):
    transport_id = category_id(client, auth_headers, "Transport")
    add_expense(client, auth_headers, food_id, "600")
    add_expense(client, auth_headers, transport_id, "100")

    budget = add_budget(client, auth_headers, category_id=food_id, period="monthly", amount="500")

    assert budget["category"]["name"] == "Food"
    assert Decimal(budget["progress"]["remaining"]) == Decimal("-100")
    assert budget["progress"]["status"] == "over"


def test_list_orders_overall_first(client, auth_headers, food_id):
    add_budget(client, auth_headers, category_id=food_id, period="monthly", amount="500")
    add_budget(client, auth_headers, period="monthly", amount="5000")

    budgets = client.get("/budgets", headers=auth_headers).json()
    assert [b["category"] and b["category"]["name"] for b in budgets] == [None, "Food"]


def test_duplicate_budget_rejected(client, auth_headers, food_id):
    add_budget(client, auth_headers, period="monthly", amount="5000")
    add_budget(client, auth_headers, period="daily", amount="500")  # other period is fine
    add_budget(client, auth_headers, category_id=food_id, period="monthly", amount="500")

    overall = client.post("/budgets", json={"period": "monthly", "amount": "1"}, headers=auth_headers)
    food = client.post(
        "/budgets", json={"category_id": food_id, "period": "monthly", "amount": "1"}, headers=auth_headers
    )
    assert overall.status_code == food.status_code == 409
    assert food.json()["detail"] == "A monthly Food budget already exists"


def test_invalid_budgets_rejected(client, auth_headers, other_headers, food_id):
    client.patch(f"/categories/{food_id}", json={"is_archived": True}, headers=auth_headers)
    archived = client.post(
        "/budgets", json={"category_id": food_id, "period": "monthly", "amount": "1"}, headers=auth_headers
    )
    others = client.post(
        "/budgets", json={"category_id": food_id, "period": "monthly", "amount": "1"}, headers=other_headers
    )
    weekly = client.post("/budgets", json={"period": "weekly", "amount": "1"}, headers=auth_headers)
    zero = client.post("/budgets", json={"period": "daily", "amount": "0"}, headers=auth_headers)

    assert archived.status_code == 400
    assert others.status_code == 404
    assert weekly.status_code == zero.status_code == 422


def test_update_and_delete(client, auth_headers, other_headers):
    budget = add_budget(client, auth_headers, period="monthly", amount="5000")
    url = f"/budgets/{budget['id']}"

    assert client.patch(url, json={"amount": "1"}, headers=other_headers).status_code == 404
    assert client.delete(url, headers=other_headers).status_code == 404

    updated = client.patch(url, json={"amount": "6000.50"}, headers=auth_headers)
    assert Decimal(updated.json()["amount"]) == Decimal("6000.50")

    assert client.delete(url, headers=auth_headers).status_code == 204
    assert client.get("/budgets", headers=auth_headers).json() == []
    assert client.delete(url, headers=auth_headers).status_code == 404


def test_expense_message_shows_budget_left(client, auth_headers, food_id):
    assert add_expense(client, auth_headers, food_id, "100")["message"] == "✅ ₹100 added to Food"

    add_budget(client, auth_headers, category_id=food_id, period="monthly", amount="1000")
    assert add_expense(client, auth_headers, food_id, "100")["message"] == (
        "✅ ₹100 added to Food · ₹800 left for Food this month"
    )

    # The overall budget wins over the category's.
    add_budget(client, auth_headers, period="monthly", amount="3500")
    assert add_expense(client, auth_headers, food_id, "250")["message"] == (
        "✅ ₹250 added to Food · ₹3,050 left this month"
    )
    assert add_expense(client, auth_headers, food_id, "3100")["message"] == (
        "✅ ₹3,100 added to Food · ₹50 over budget this month"
    )
