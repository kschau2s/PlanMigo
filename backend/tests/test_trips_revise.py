import uuid
from datetime import date

import pytest

from app.core.deps import get_db
from app.main import app
from app.models.trip_item import TripItem, TripItemType
from app.models.trip_plan import TripPlan
from app.services import planner
from app.services.openrouter import LLMServiceError

pytestmark = pytest.mark.asyncio

TRIP_ID = uuid.uuid4()


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


def _plan() -> TripPlan:
    plan = TripPlan(
        id=TRIP_ID,
        conversation_id=uuid.uuid4(),
        destination="Bali, Indonesien",
        start_date=date(2026, 9, 1),
        end_date=date(2026, 9, 7),
        budget=1500,
        summary="Strand und Kultur.",
    )
    plan.items = [
        TripItem(
            id=uuid.uuid4(),
            trip_plan_id=TRIP_ID,
            type=TripItemType.ACTIVITY,
            payload={"title": "Kochkurs"},
            day=2,
            order=0,
        )
    ]
    return plan


async def test_revise_returns_updated_plan(client, monkeypatch):
    async def fake_revise(db, trip_plan_id, change_request, user_id=None):
        assert trip_plan_id == TRIP_ID
        assert change_request == "Ersetze Tag 2 durch einen Kochkurs"
        return _plan()

    monkeypatch.setattr(planner, "revise_trip_plan", fake_revise)

    response = await client.post(
        f"/api/v1/trips/{TRIP_ID}/revise",
        json={"message": "Ersetze Tag 2 durch einen Kochkurs"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(TRIP_ID)
    assert data["items"][0]["payload"]["title"] == "Kochkurs"


async def test_revise_unknown_plan_returns_404(client, monkeypatch):
    async def fake_revise(db, trip_plan_id, change_request, user_id=None):
        return None

    monkeypatch.setattr(planner, "revise_trip_plan", fake_revise)

    response = await client.post(
        f"/api/v1/trips/{uuid.uuid4()}/revise", json={"message": "Bitte ändern"}
    )
    assert response.status_code == 404


async def test_revise_foreign_plan_returns_404(client, monkeypatch):
    async def fake_revise(db, trip_plan_id, change_request, user_id=None):
        raise planner.ConversationAccessError()

    monkeypatch.setattr(planner, "revise_trip_plan", fake_revise)

    response = await client.post(
        f"/api/v1/trips/{TRIP_ID}/revise", json={"message": "Bitte ändern"}
    )
    assert response.status_code == 404


async def test_revise_maps_llm_error_to_503(client, monkeypatch):
    async def fake_revise(db, trip_plan_id, change_request, user_id=None):
        raise LLMServiceError("OpenRouter down")

    monkeypatch.setattr(planner, "revise_trip_plan", fake_revise)

    response = await client.post(
        f"/api/v1/trips/{TRIP_ID}/revise", json={"message": "Bitte ändern"}
    )
    assert response.status_code == 503


async def test_revise_rejects_empty_message(client):
    response = await client.post(f"/api/v1/trips/{TRIP_ID}/revise", json={"message": ""})
    assert response.status_code == 422
