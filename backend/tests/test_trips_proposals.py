import uuid

import pytest

from app.core.deps import get_db
from app.main import app
from app.services import planner
from app.services.openrouter import LLMServiceError

pytestmark = pytest.mark.asyncio

PROPOSALS = [
    {
        "destination": "Bali, Indonesien",
        "timeframe": "01.–08.09.2026 (7 Tage)",
        "estimated_budget": 1500.0,
        "highlights": ["Strand", "Tempel", "Reisterrassen"],
        "lat": -8.41,
        "lon": 115.19,
        "image_query": "bali beach",
    }
]


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


async def test_proposals_returned(client, monkeypatch):
    conversation_id = uuid.uuid4()

    async def fake_generate(db, cid, user_id=None):
        assert cid == conversation_id
        return PROPOSALS

    monkeypatch.setattr(planner, "generate_trip_proposals", fake_generate)

    response = await client.post(
        "/api/v1/trips/proposals", json={"conversation_id": str(conversation_id)}
    )
    assert response.status_code == 200
    proposals = response.json()["proposals"]
    assert len(proposals) == 1
    assert proposals[0]["destination"] == "Bali, Indonesien"
    assert proposals[0]["lat"] == -8.41


async def test_proposals_unknown_conversation_404(client, monkeypatch):
    async def fake_generate(db, cid, user_id=None):
        return None

    monkeypatch.setattr(planner, "generate_trip_proposals", fake_generate)

    response = await client.post(
        "/api/v1/trips/proposals", json={"conversation_id": str(uuid.uuid4())}
    )
    assert response.status_code == 404


async def test_proposals_foreign_conversation_404(client, monkeypatch):
    async def fake_generate(db, cid, user_id=None):
        raise planner.ConversationAccessError()

    monkeypatch.setattr(planner, "generate_trip_proposals", fake_generate)

    response = await client.post(
        "/api/v1/trips/proposals", json={"conversation_id": str(uuid.uuid4())}
    )
    assert response.status_code == 404


async def test_proposals_llm_error_503(client, monkeypatch):
    async def fake_generate(db, cid, user_id=None):
        raise LLMServiceError("OpenRouter down")

    monkeypatch.setattr(planner, "generate_trip_proposals", fake_generate)

    response = await client.post(
        "/api/v1/trips/proposals", json={"conversation_id": str(uuid.uuid4())}
    )
    assert response.status_code == 503
