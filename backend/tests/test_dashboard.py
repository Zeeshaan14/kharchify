from decimal import Decimal

import pytest

from tests.conftest import add_budget, add_expense, category_id

pytestmark = pytest.mark.usefixtures("frozen_today")


def get_summary(client, headers, month=None):
    res = client.get("/dashboard/summary", params={"month": month} if month else None, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def test_current_month_summary(client, auth_headers, food_id):
    transport_id = category_id(client, auth_headers, "Transport")
    health_id = category_id(client, auth_headers, "Health")
    add_expense(client, auth_headers, food_id, "1000", "2026-10-01")
    add_expense(client, auth_headers, transport_id, "2000", "2026-10-10")
    add_expense(client, auth_headers, food_id, "500")  # today
    add_expense(client, auth_headers, food_id, "999", "2026-09-30")  # last month
    add_budget(client, auth_headers, period="monthly", amount="31000")
    add_budget(client, auth_headers, period="daily", amount="400")
    add_budget(client, auth_headers, category_id=health_id, period="monthly", amount="1000")

    s = get_summary(client, auth_headers)

    assert s["month"] == "2026-10"
    assert s["today"] == "2026-10-11"
    assert Decimal(s["spent_today"]) == Decimal("500")
    assert s["daily_budget"]["status"] == "over"
    assert Decimal(s["month_total"]) == Decimal("3500")
    assert Decimal(s["monthly_budget"]["remaining"]) == Decimal("27500")
    # (31000 - 3000 spent before today) / 21 days left = 1333.33, minus 500 spent today.
    assert s["days_left"] == 21
    assert Decimal(s["safe_to_spend_today"]) == Decimal("833.33")

    by_category = [(c["category"]["name"], Decimal(c["total"]), c["share"]) for c in s["by_category"]]
    assert by_category == [("Transport", 2000, 57), ("Food", 1500, 43), ("Health", 0, 0)]
    assert s["by_category"][2]["budget"]["status"] == "ok"
    assert s["by_category"][0]["budget"] is None

    assert [Decimal(e["amount"]) for e in s["top_expenses"]] == [2000, 1000, 500]

    assert len(s["daily"]) == 11
    assert s["daily"][0] == {"day": "2026-10-01", "total": "1000.00"}
    assert Decimal(s["daily"][1]["total"]) == 0
    assert Decimal(s["daily"][9]["total"]) == Decimal("2000")


def test_safe_to_spend_never_negative(client, auth_headers, food_id):
    add_budget(client, auth_headers, period="monthly", amount="1000")
    add_expense(client, auth_headers, food_id, "5000")

    assert Decimal(get_summary(client, auth_headers)["safe_to_spend_today"]) == 0


def test_no_budgets(client, auth_headers, food_id):
    add_expense(client, auth_headers, food_id, "100")
    s = get_summary(client, auth_headers)

    assert s["daily_budget"] is s["monthly_budget"] is None
    assert s["days_left"] is s["safe_to_spend_today"] is None


def test_past_and_future_months(client, auth_headers, food_id):
    add_budget(client, auth_headers, period="monthly", amount="1000")
    add_expense(client, auth_headers, food_id, "999", "2026-09-30")

    past = get_summary(client, auth_headers, "2026-09")
    assert Decimal(past["month_total"]) == Decimal("999")
    assert past["monthly_budget"]["status"] == "warning"
    assert past["safe_to_spend_today"] is None
    assert len(past["daily"]) == 30

    future = get_summary(client, auth_headers, "2026-12")
    assert Decimal(future["month_total"]) == 0
    assert future["daily"] == []


def test_invalid_month(client, auth_headers):
    for month in ("2026-13", "2026-1", "oct"):
        res = client.get("/dashboard/summary", params={"month": month}, headers=auth_headers)
        assert res.status_code == 422


def test_other_users_data_not_included(client, auth_headers, other_headers, food_id):
    add_expense(client, auth_headers, food_id, "100")
    add_budget(client, auth_headers, period="monthly", amount="1000")

    s = get_summary(client, other_headers)
    assert Decimal(s["month_total"]) == 0
    assert s["monthly_budget"] is None
    assert s["by_category"] == s["top_expenses"] == []
