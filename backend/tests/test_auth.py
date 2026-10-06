import uuid
from datetime import datetime, timezone

import pytest

from app.core.deps import get_current_user, get_db
from app.main import app
from app.models.user import User
from app.services import auth as auth_service

pytestmark = pytest.mark.asyncio


class FakeDB:
    async def close(self):
        pass


async def override_get_db():
    yield FakeDB()


@pytest.fixture(autouse=True)
def db_override():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


def make_user(email: str = "user@example.com") -> User:
    return User(
        id=uuid.uuid4(), email=email, hashed_password="hashed", created_at=datetime.now(timezone.utc)
    )


async def test_register_returns_token(client, monkeypatch):
    user = make_user()

    async def fake_register(db, email, password):
        return user

    monkeypatch.setattr(auth_service, "register_user", fake_register)

    response = await client.post(
        "/api/v1/auth/register", json={"email": "user@example.com", "password": "supersecret"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]


async def test_register_rejects_duplicate_email(client, monkeypatch):
    async def fake_register(db, email, password):
        raise auth_service.EmailAlreadyRegisteredError(email)

    monkeypatch.setattr(auth_service, "register_user", fake_register)

    response = await client.post(
        "/api/v1/auth/register", json={"email": "user@example.com", "password": "supersecret"}
    )
    assert response.status_code == 409


async def test_register_rejects_short_password(client):
    response = await client.post(
        "/api/v1/auth/register", json={"email": "user@example.com", "password": "short"}
    )
    assert response.status_code == 422


async def test_register_rejects_invalid_email(client):
    response = await client.post(
        "/api/v1/auth/register", json={"email": "not-an-email", "password": "supersecret"}
    )
    assert response.status_code == 422


async def test_login_returns_token(client, monkeypatch):
    user = make_user()

    async def fake_auth(db, email, password):
        return user

    monkeypatch.setattr(auth_service, "authenticate_user", fake_auth)

    response = await client.post(
        "/api/v1/auth/login", json={"email": "user@example.com", "password": "supersecret"}
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


async def test_login_rejects_wrong_credentials(client, monkeypatch):
    async def fake_auth(db, email, password):
        raise auth_service.InvalidCredentialsError()

    monkeypatch.setattr(auth_service, "authenticate_user", fake_auth)

    response = await client.post(
        "/api/v1/auth/login", json={"email": "user@example.com", "password": "wrong"}
    )
    assert response.status_code == 401


async def test_me_requires_authentication(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_me_returns_current_user(client):
    user = make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        response = await client.get("/api/v1/auth/me")
    finally:
        app.dependency_overrides.pop(get_current_user, None)
    assert response.status_code == 200
    assert response.json()["email"] == user.email
