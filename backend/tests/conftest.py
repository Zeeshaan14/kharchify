import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db():
    # Fresh in-memory SQLite per test; StaticPool keeps one shared connection.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def register_and_login(client, email):
    client.post("/auth/register", json={"email": email, "name": "Me", "password": "secret123"})
    token = client.post(
        "/auth/login", data={"username": email, "password": "secret123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers(client):
    return register_and_login(client, "me@example.com")


@pytest.fixture
def other_headers(client):
    """A second user, for checking data isolation."""
    return register_and_login(client, "someone-else@example.com")


@pytest.fixture
def food_id(client, auth_headers):
    categories = client.get("/categories", headers=auth_headers).json()
    return next(c["id"] for c in categories if c["name"] == "Food")
