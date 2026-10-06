from pathlib import Path

from app.schemas.chat import ChatMessage
from app.services import openrouter
from app.services.planner import _parse_budget

PROMPTS_DIR = Path(__file__).parent / "prompts"


async def suggest_flights(keywords: list[str]) -> list[dict]:
    prompt = (PROMPTS_DIR / "flights.md").read_text(encoding="utf-8").format(
        keywords=", ".join(keywords) or "keine – schlage allgemein beliebte Reiseziele vor",
    )

    response = await openrouter.complete(
        messages=[ChatMessage(role="user", content=prompt)],
        response_format={"type": "json_object"},
        reasoning={"enabled": False},
        max_tokens=1200,
    )
    data = openrouter.parse_json_object(response.content)
    raw_flights = data.get("flights", [])
    if not isinstance(raw_flights, list):
        raise openrouter.LLMServiceError("LLM flights JSON missing a 'flights' list")

    flights: list[dict] = []
    for index, item in enumerate(raw_flights):
        if not isinstance(item, dict):
            continue
        price = _parse_budget(item.get("price"))
        if price is None:
            continue
        flights.append(
            {
                "id": str(item.get("id") or f"f{index + 1}"),
                "airline": str(item.get("airline") or "Unbekannte Airline"),
                "destination": str(item.get("destination") or "Unbekanntes Ziel"),
                "depart_month": _opt_str(item.get("depart_month")),
                "duration": _opt_str(item.get("duration")),
                "stops": _opt_str(item.get("stops")),
                "price": price,
                "note": _opt_str(item.get("note")),
            }
        )
    return flights


def _opt_str(value: object) -> str | None:
    return None if value is None else str(value)
