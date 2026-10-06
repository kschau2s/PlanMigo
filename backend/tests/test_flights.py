import pytest

from app.services import flights as flights_service
from app.services import openrouter
from app.services.openrouter import LLMServiceError

pytestmark = pytest.mark.asyncio


async def test_suggest_flights_endpoint_returns_list(client, monkeypatch):
    async def fake_suggest(keywords):
        return [
            {
                "id": "f1",
                "airline": "Austrian Airlines",
                "destination": "Innsbruck, Österreich",
                "depart_month": "September 2026",
                "duration": "1 Std. 40 Min.",
                "stops": "Direktflug",
                "price": 189.0,
                "note": "Hin- und Rückflug p.P.",
            }
        ]

    monkeypatch.setattr(flights_service, "suggest_flights", fake_suggest)

    response = await client.post("/api/v1/flights/suggest", json={"keywords": ["Berge"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data["flights"]) == 1
    assert data["flights"][0]["price"] == 189.0


async def test_suggest_flights_endpoint_maps_llm_error_to_503(client, monkeypatch):
    async def fake_suggest(keywords):
        raise LLMServiceError("OpenRouter down")

    monkeypatch.setattr(flights_service, "suggest_flights", fake_suggest)

    response = await client.post("/api/v1/flights/suggest", json={"keywords": []})
    assert response.status_code == 503


async def test_suggest_flights_parses_price_and_drops_incomplete_entries(monkeypatch):
    async def fake_complete(messages, **kwargs):
        return openrouter.LLMResponse(
            content=(
                '{"flights": ['
                '{"id": "f1", "airline": "X", "destination": "Rom", "price": "ca. 150 €"},'
                '{"airline": "Y", "destination": "Berlin"}'
                "]}"
            ),
            model="test-model",
            raw={},
        )

    monkeypatch.setattr(openrouter, "complete", fake_complete)

    flights = await flights_service.suggest_flights(["Städtetrip"])

    assert len(flights) == 1
    assert flights[0]["id"] == "f1"
    assert flights[0]["price"] == 150.0
