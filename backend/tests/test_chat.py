import uuid

import pytest

from app.core.deps import get_db
from app.main import app
from app.models.conversation import Conversation
from app.services import planner
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


async def test_chat_returns_reply(client, monkeypatch):
    conversation = Conversation(id=uuid.uuid4(), keywords=["Berge"], state={"history": []})

    async def fake_turn(db, conversation_id, keywords, user_message, user_id=None):
        return conversation, "Wann möchtest du verreisen?", False

    monkeypatch.setattr(planner, "next_clarifying_turn", fake_turn)

    response = await client.post(
        "/api/v1/chat", json={"conversation_id": None, "keywords": ["Berge"], "message": ""}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["conversation_id"] == str(conversation.id)
    assert data["reply"] == "Wann möchtest du verreisen?"
    assert data["ready_to_plan"] is False


async def test_chat_signals_ready_to_plan(client, monkeypatch):
    conversation = Conversation(id=uuid.uuid4(), keywords=[], state={"history": []})

    async def fake_turn(db, conversation_id, keywords, user_message, user_id=None):
        return conversation, planner.READY_REPLY, True

    monkeypatch.setattr(planner, "next_clarifying_turn", fake_turn)

    response = await client.post("/api/v1/chat", json={"message": "Im September, 1500 Euro"})
    assert response.status_code == 200
    assert response.json()["ready_to_plan"] is True


async def test_chat_maps_llm_error_to_503(client, monkeypatch):
    async def fake_turn(db, conversation_id, keywords, user_message, user_id=None):
        raise LLMServiceError("OpenRouter down")

    monkeypatch.setattr(planner, "next_clarifying_turn", fake_turn)

    response = await client.post("/api/v1/chat", json={"message": "Hallo"})
    assert response.status_code == 503
