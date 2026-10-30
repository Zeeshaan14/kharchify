from sqlalchemy import select

from app.defaults import DEFAULT_CATEGORIES
from app.models import Category, User

USER = {"email": "Me@Example.com", "name": "Me", "password": "secret123"}


def test_register_creates_user_with_default_categories(client, db):
    res = client.post("/auth/register", json=USER)

    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "me@example.com"
    assert "password" not in body and "hashed_password" not in body

    user = db.scalar(select(User))
    names = set(db.scalars(select(Category.name).where(Category.user_id == user.id)))
    assert names == {name for name, _, _ in DEFAULT_CATEGORIES}


def test_register_rejects_duplicate_email(client):
    client.post("/auth/register", json=USER)
    res = client.post("/auth/register", json={**USER, "email": "me@example.com"})
    assert res.status_code == 409


def test_register_rejects_short_password(client):
    res = client.post("/auth/register", json={**USER, "password": "short"})
    assert res.status_code == 422


def test_login_and_me(client, auth_headers):
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "me@example.com"


def test_login_wrong_password(client):
    client.post("/auth/register", json=USER)
    res = client.post("/auth/login", data={"username": USER["email"], "password": "wrong-pass"})
    assert res.status_code == 401


def test_me_requires_valid_token(client):
    assert client.get("/auth/me").status_code == 401
    res = client.get("/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert res.status_code == 401
