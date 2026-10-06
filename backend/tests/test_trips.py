import uuid
from datetime import datetime, timezone

import pytest

from app.core.deps import get_current_user, get_db
from app.main import app
from app.models.user import User

pytestmark = pytest.mark.asyncio


class FakeScalars:
    def __init__(self, trips):
        self._trips = trips

    def all(self):
        return self._trips


class FakeResult:
    def __init__(self, trips):
        self._trips = trips

    def scalars(self):
        return FakeScalars(self._trips)


class FakeDB:
    def __init__(self, trips=None):
        self._trips = trips or []

    async def execute(self, _query):
        return FakeResult(self._trips)

    async def close(self):
        pass


def make_user() -> User:
    return User(
        id=uuid.uuid4(),
        email="user@example.com",
        hashed_password="hashed",
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture(autouse=True)
def auth_override():
    user = make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(get_current_user, None)


async def test_list_my_trips_requires_authentication(client):
    app.dependency_overrides.pop(get_current_user, None)

    async def override_get_db():
        yield FakeDB([])

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = await client.get("/api/v1/trips/mine")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 401


async def test_list_my_trips_returns_empty_list(client):
    async def override_get_db():
        yield FakeDB([])

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = await client.get("/api/v1/trips/mine")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 200
    assert response.json() == []
