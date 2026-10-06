import uuid

import pytest

from app.main import app
from app.core.deps import get_db
from app.services import destinations as destinations_service
from app.services import openrouter
from app.services.openrouter import LLMServiceError

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


async def test_suggest_destinations_endpoint_returns_list(client, monkeypatch):
    async def fake_suggest(db, conversation_id, keywords):
        return [
            {
                "id": "d1",
                "name": "Innsbruck",
                "country": "Österreich",
                "lat": 47.2692,
                "lng": 11.4041,
                "reason": "Passt zu Berge/Wandern",
            }
        ]

    monkeypatch.setattr(destinations_service, "suggest_destinations", fake_suggest)

    response = await client.post(
        "/api/v1/destinations/suggest",
        json={"conversation_id": str(uuid.uuid4()), "keywords": ["Berge"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["destinations"]) == 1
    assert data["destinations"][0]["lat"] == 47.2692


async def test_suggest_destinations_endpoint_maps_llm_error_to_503(client, monkeypatch):
    async def fake_suggest(db, conversation_id, keywords):
        raise LLMServiceError("OpenRouter down")

    monkeypatch.setattr(destinations_service, "suggest_destinations", fake_suggest)

    response = await client.post(
        "/api/v1/destinations/suggest",
        json={"conversation_id": str(uuid.uuid4()), "keywords": []},
    )
    assert response.status_code == 503


async def test_suggest_destinations_drops_entries_without_coordinates(monkeypatch):
    class FakeConversation:
        state = {"history": []}

    class FakeDBWithConversation:
        async def get(self, model, pk):
            return FakeConversation()

    async def fake_complete(messages, **kwargs):
        return openrouter.LLMResponse(
            content=(
                '{"destinations": ['
                '{"id": "d1", "name": "Rom", "country": "Italien", "lat": 41.9, "lng": 12.5},'
                '{"id": "d2", "name": "Ohne Koordinaten", "country": "?"}'
                "]}"
            ),
            model="test-model",
            raw={},
        )

    monkeypatch.setattr(openrouter, "complete", fake_complete)

    destinations = await destinations_service.suggest_destinations(
        FakeDBWithConversation(), uuid.uuid4(), ["Städtetrip"]
    )

    assert len(destinations) == 1
    assert destinations[0]["name"] == "Rom"
