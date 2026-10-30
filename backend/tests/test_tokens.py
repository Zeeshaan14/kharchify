from sqlalchemy import select

from app.models import ApiToken


def create_token(client, headers, name="iPhone Shortcut"):
    res = client.post("/tokens", json={"name": name}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def test_create_returns_plain_token_once(client, auth_headers, db):
    created = create_token(client, auth_headers)
    assert created["token"].startswith("kh_")
    assert created["prefix"] == created["token"][:10]

    listed = client.get("/tokens", headers=auth_headers).json()
    assert len(listed) == 1 and "token" not in listed[0]
    # Only the hash is stored.
    assert db.scalar(select(ApiToken.token_hash)) != created["token"]


def test_api_token_can_add_expense_and_marks_last_used(client, auth_headers, food_id):
    token = create_token(client, auth_headers)["token"]
    shortcut = {"Authorization": f"Bearer {token}"}

    res = client.post("/expenses", json={"amount": 250, "category_id": food_id}, headers=shortcut)
    assert res.status_code == 201
    assert client.get("/categories", headers=shortcut).status_code == 200
    assert client.get("/tokens", headers=auth_headers).json()[0]["last_used_at"] is not None


def test_api_token_cannot_manage_tokens(client, auth_headers):
    token = create_token(client, auth_headers)["token"]
    shortcut = {"Authorization": f"Bearer {token}"}
    assert client.post("/tokens", json={"name": "sneaky"}, headers=shortcut).status_code == 403
    assert client.get("/tokens", headers=shortcut).status_code == 403


def test_revoked_token_stops_working(client, auth_headers):
    created = create_token(client, auth_headers)
    shortcut = {"Authorization": f"Bearer {created['token']}"}

    assert client.delete(f"/tokens/{created['id']}", headers=auth_headers).status_code == 204
    assert client.get("/categories", headers=shortcut).status_code == 401


def test_unknown_api_token_rejected(client):
    res = client.get("/categories", headers={"Authorization": "Bearer kh_made-up"})
    assert res.status_code == 401


def test_cannot_revoke_another_users_token(client, auth_headers, other_headers):
    created = create_token(client, auth_headers)
    assert client.delete(f"/tokens/{created['id']}", headers=other_headers).status_code == 404
