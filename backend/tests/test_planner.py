import uuid
from datetime import date

import pytest

from app.services import openrouter, planner
from app.services.openrouter import LLMResponse


class FakeDB:
    """Minimal async-session stub for planner turns without a real database."""

    def __init__(self, conversation=None):
        self.conversation = conversation
        self.added = []

    async def get(self, model, pk):
        return self.conversation

    def add(self, obj):
        self.added.append(obj)
        if getattr(obj, "id", None) is None:
            obj.id = uuid.uuid4()

    async def flush(self):
        pass

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


def make_llm_response(content: str) -> LLMResponse:
    return LLMResponse(content=content, model="test-model", raw={})


async def test_first_turn_asks_question_without_user_message(monkeypatch):
    captured = {}

    async def fake_complete(messages, **kwargs):
        captured["messages"] = messages
        return make_llm_response("Wohin soll es ungefähr gehen? 🏔️")

    monkeypatch.setattr(openrouter, "complete", fake_complete)

    conversation, reply, ready = await planner.next_clarifying_turn(
        db=FakeDB(), conversation_id=None, keywords=["Berge", "ruhig"], user_message=""
    )

    assert ready is False
    assert reply == "Wohin soll es ungefähr gehen? 🏔️"
    assert conversation.state["history"] == [{"role": "assistant", "content": reply}]
    assert captured["messages"][0].role == "system"
    assert "Berge, ruhig" in captured["messages"][0].content


async def test_ready_marker_is_detected_and_never_leaks(monkeypatch):
    async def fake_complete(messages, **kwargs):
        return make_llm_response("Alles klar!\nREADY_TO_PLAN")

    monkeypatch.setattr(openrouter, "complete", fake_complete)

    conversation, reply, ready = await planner.next_clarifying_turn(
        db=FakeDB(), conversation_id=None, keywords=["Strand"], user_message="Budget 1500 Euro"
    )

    assert ready is True
    assert planner.READY_MARKER not in reply
    assert all(planner.READY_MARKER not in m["content"] for m in conversation.state["history"])


async def test_forces_ready_after_max_clarify_turns(monkeypatch):
    async def fake_complete(messages, **kwargs):
        return make_llm_response("Noch eine Frage?")

    monkeypatch.setattr(openrouter, "complete", fake_complete)

    history = [
        {"role": "assistant", "content": f"Frage {i}"} for i in range(planner.MAX_CLARIFY_TURNS - 1)
    ]
    conversation = planner.Conversation(
        id=uuid.uuid4(), keywords=["Berge"], state={"history": history}
    )

    _, reply, ready = await planner.next_clarifying_turn(
        db=FakeDB(conversation),
        conversation_id=conversation.id,
        keywords=[],
        user_message="Antwort",
    )

    assert ready is True
    assert reply == planner.READY_REPLY


def test_parse_plan_json_accepts_markdown_fences():
    assert planner._parse_plan_json('```json\n{"destination": "Bozen"}\n```') == {
        "destination": "Bozen"
    }
    assert planner._parse_plan_json('{"destination": "Bozen"}') == {"destination": "Bozen"}


def test_parse_plan_json_rejects_invalid_payloads():
    with pytest.raises(openrouter.LLMServiceError):
        planner._parse_plan_json("kein json")
    with pytest.raises(openrouter.LLMServiceError):
        planner._parse_plan_json('["liste"]')


def test_parse_date_and_budget_are_tolerant():
    assert planner._parse_date("2026-09-12") == date(2026, 9, 12)
    assert planner._parse_date("2026-09-12T10:00:00") == date(2026, 9, 12)
    assert planner._parse_date("unbekannt") is None
    assert planner._parse_date(None) is None

    assert planner._parse_budget(1500) == 1500.0
    assert planner._parse_budget("ca. 1.500 €") == 1500.0
    assert planner._parse_budget("1.500,50 €") == 1500.5
    assert planner._parse_budget("1500 EUR") == 1500.0
    assert planner._parse_budget(None) is None
