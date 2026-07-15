"""Auth endpoint tests.

These run against the real Postgres (docker-compose `db` service) because the
models use Postgres-only types (UUID/JSONB/ARRAY) — SQLite is not an option.
When no database is reachable the whole module is skipped, so the suite stays
green outside the compose network.
"""

import uuid

import pytest
from sqlalchemy import delete

from app.main import run_migrations_sync
from app.models.session import async_session_factory, engine
from app.models.user import User

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
async def _dispose_engine():
    # pytest-asyncio runs every test on a fresh event loop; pooled connections
    # are bound to the loop they were created on, so drop them after each test.
    yield
    await engine.dispose()


@pytest.fixture(scope="module")
def _database():
    try:
        run_migrations_sync()
    except Exception:
        pytest.skip("Postgres not reachable — auth tests need the compose db service")


@pytest.fixture
async def credentials(_database):
    email = f"test-{uuid.uuid4().hex[:12]}@example.com"
    yield {"email": email, "password": "geheim-und-lang"}
    async with async_session_factory() as session:
        await session.execute(delete(User).where(User.email == email))
        await session.commit()


async def test_register_login_me_roundtrip(client, credentials):
    register = await client.post("/api/v1/auth/register", json=credentials)
    assert register.status_code == 201
    body = register.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == credentials["email"]
    assert "password" not in body["user"]

    login = await client.post("/api/v1/auth/login", json=credentials)
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == credentials["email"]


async def test_register_duplicate_email_conflicts(client, credentials):
    first = await client.post("/api/v1/auth/register", json=credentials)
    assert first.status_code == 201
    second = await client.post("/api/v1/auth/register", json=credentials)
    assert second.status_code == 409


async def test_login_wrong_password_unauthorized(client, credentials):
    await client.post("/api/v1/auth/register", json=credentials)
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": credentials["email"], "password": "falsches-passwort"},
    )
    assert response.status_code == 401


async def test_register_rejects_short_password(client, _database):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": f"kurz-{uuid.uuid4().hex[:8]}@example.com", "password": "kurz"},
    )
    assert response.status_code == 422


async def test_me_without_token_unauthorized(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_trips_listing_requires_auth(client):
    response = await client.get("/api/v1/trips")
    assert response.status_code == 401
