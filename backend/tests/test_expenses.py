from decimal import Decimal

import pytest

from app.models import User
from app.services.expenses import format_inr, today_for


def add(client, headers, category_id, **fields):
    body = {"amount": "100", "category_id": category_id, **fields}
    res = client.post("/expenses", json=body, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def test_create_defaults_and_message(client, auth_headers, food_id):
    res = client.post("/expenses", json={"amount": 250, "category_id": food_id}, headers=auth_headers)

    assert res.status_code == 201
    body = res.json()
    assert Decimal(body["amount"]) == Decimal("250")
    assert body["payment_method"] == "upi"
    assert body["category"]["name"] == "Food"
    assert body["spent_on"] == today_for(User(timezone="Asia/Kolkata")).isoformat()
    assert body["message"] == "✅ ₹250 added to Food"


@pytest.mark.parametrize("amount", [0, -5, "12.345", "1e20"])
def test_invalid_amounts_rejected(client, auth_headers, food_id, amount):
    res = client.post("/expenses", json={"amount": amount, "category_id": food_id}, headers=auth_headers)
    assert res.status_code == 422


def test_invalid_payment_method_rejected(client, auth_headers, food_id):
    res = client.post(
        "/expenses", json={"amount": 10, "category_id": food_id, "payment_method": "bitcoin"}, headers=auth_headers
    )
    assert res.status_code == 422


def test_cannot_use_archived_category(client, auth_headers, food_id):
    client.patch(f"/categories/{food_id}", json={"is_archived": True}, headers=auth_headers)
    res = client.post("/expenses", json={"amount": 10, "category_id": food_id}, headers=auth_headers)
    assert res.status_code == 400
    assert "archived" in res.json()["detail"]


def test_cannot_use_another_users_category(client, auth_headers, other_headers, food_id):
    res = client.post("/expenses", json={"amount": 10, "category_id": food_id}, headers=other_headers)
    assert res.status_code == 404


def test_list_filters_and_pagination(client, auth_headers, food_id):
    categories = client.get("/categories", headers=auth_headers).json()
    transport_id = next(c["id"] for c in categories if c["name"] == "Transport")
    add(client, auth_headers, food_id, spent_on="2026-10-01", note="Swiggy dinner")
    add(client, auth_headers, food_id, spent_on="2026-10-15", payment_method="cash")
    add(client, auth_headers, transport_id, spent_on="2026-10-20", note="Uber")
    add(client, auth_headers, food_id, spent_on="2026-09-30")

    def ids_for(query):
        res = client.get(f"/expenses?{query}", headers=auth_headers)
        assert res.status_code == 200
        return res.json()

    october = ids_for("date_from=2026-10-01&date_to=2026-10-31")
    assert october["total"] == 3
    # Newest first.
    assert [e["spent_on"] for e in october["items"]] == ["2026-10-20", "2026-10-15", "2026-10-01"]

    assert ids_for(f"category_id={transport_id}")["total"] == 1
    assert ids_for("payment_method=cash")["total"] == 1
    assert ids_for("q=swiggy")["items"][0]["note"] == "Swiggy dinner"

    page = ids_for("limit=2&offset=2")
    assert page["total"] == 4 and len(page["items"]) == 2


def test_list_only_shows_own_expenses(client, auth_headers, other_headers, food_id):
    add(client, auth_headers, food_id)
    assert client.get("/expenses", headers=other_headers).json()["total"] == 0


def test_update_expense(client, auth_headers, food_id):
    expense = add(client, auth_headers, food_id, note="old")
    categories = client.get("/categories", headers=auth_headers).json()
    bills_id = next(c["id"] for c in categories if c["name"] == "Bills")

    res = client.patch(
        f"/expenses/{expense['id']}",
        json={"amount": "99.50", "category_id": bills_id, "note": None},
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert Decimal(body["amount"]) == Decimal("99.50")
    assert body["category"]["name"] == "Bills"
    assert body["note"] is None


def test_update_cannot_clear_required_field(client, auth_headers, food_id):
    expense = add(client, auth_headers, food_id)
    res = client.patch(f"/expenses/{expense['id']}", json={"amount": None}, headers=auth_headers)
    assert res.status_code == 400


def test_delete_expense(client, auth_headers, other_headers, food_id):
    expense = add(client, auth_headers, food_id)
    assert client.delete(f"/expenses/{expense['id']}", headers=other_headers).status_code == 404
    assert client.delete(f"/expenses/{expense['id']}", headers=auth_headers).status_code == 204
    assert client.get(f"/expenses/{expense['id']}", headers=auth_headers).status_code == 404


@pytest.mark.parametrize(
    "amount, expected",
    [("5", "₹5"), ("250.50", "₹250.50"), ("1000", "₹1,000"), ("123456.75", "₹1,23,456.75"), ("12345678", "₹1,23,45,678")],
)
def test_format_inr(amount, expected):
    assert format_inr(Decimal(amount)) == expected


@pytest.mark.parametrize("note, stored", [("", None), ("   ", None), ("  chai  ", "chai")])
def test_blank_note_stored_as_none(client, auth_headers, food_id, note, stored):
    assert add(client, auth_headers, food_id, note=note)["note"] == stored
