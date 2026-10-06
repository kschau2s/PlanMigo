import uuid
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.schemas.chat import ChatMessage
from app.services import openrouter

PROMPTS_DIR = Path(__file__).parent / "prompts"


async def suggest_destinations(
    db: AsyncSession, conversation_id: uuid.UUID, keywords: list[str]
) -> list[dict]:
    conversation = await db.get(Conversation, conversation_id)
    history: list[dict] = conversation.state.get("history", []) if conversation else []

    prompt = (PROMPTS_DIR / "destinations.md").read_text(encoding="utf-8").format(
        keywords=", ".join(keywords) or "keine",
        history="\n".join(f"{m['role']}: {m['content']}" for m in history) or "kein Dialog",
    )

    response = await openrouter.complete(
        messages=[ChatMessage(role="user", content=prompt)],
        response_format={"type": "json_object"},
        reasoning={"enabled": False},
        max_tokens=1000,
    )
    data = openrouter.parse_json_object(response.content)
    raw_destinations = data.get("destinations", [])
    if not isinstance(raw_destinations, list):
        raise openrouter.LLMServiceError("LLM destinations JSON missing a 'destinations' list")

    destinations: list[dict] = []
    for index, item in enumerate(raw_destinations):
        if not isinstance(item, dict):
            continue
        lat = _parse_float(item.get("lat"))
        lng = _parse_float(item.get("lng"))
        name = item.get("name")
        if lat is None or lng is None or not isinstance(name, str) or not name.strip():
            continue
        destinations.append(
            {
                "id": str(item.get("id") or f"d{index + 1}"),
                "name": name.strip(),
                "country": str(item.get("country") or "").strip(),
                "lat": lat,
                "lng": lng,
                "reason": _opt_str(item.get("reason")),
            }
        )
    return destinations


def _parse_float(value: object) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def _opt_str(value: object) -> str | None:
    return None if value is None else str(value)
