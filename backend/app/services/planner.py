import json
import re
import uuid
from datetime import date
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation
from app.models.trip_item import TripItem, TripItemType
from app.models.trip_plan import TripPlan
from app.schemas.chat import ChatMessage
from app.schemas.trip import TripPlanRequest
from app.services import openrouter, travel_api

PROMPTS_DIR = Path(__file__).parent / "prompts"

READY_MARKER = "READY_TO_PLAN"
READY_REPLY = (
    "Perfekt, ich habe alles, was ich brauche! 🎒 "
    "Ich suche dir jetzt ein paar passende Reiseideen heraus …"
)
MAX_CLARIFY_TURNS = 5

VALID_ITEM_TYPES = {t.value for t in TripItemType}


class ConversationAccessError(Exception):
    """Conversation exists but belongs to a different user."""


def _check_conversation_access(
    conversation: Conversation, user_id: uuid.UUID | None
) -> None:
    if conversation.user_id is not None and conversation.user_id != user_id:
        raise ConversationAccessError(str(conversation.id))


async def next_clarifying_turn(
    db: AsyncSession,
    conversation_id: uuid.UUID | None,
    keywords: list[str],
    user_message: str,
    user_id: uuid.UUID | None = None,
) -> tuple[Conversation, str, bool]:
    conversation = None
    if conversation_id is not None:
        conversation = await db.get(Conversation, conversation_id)

    if conversation is None:
        conversation = Conversation(keywords=keywords, state={"history": []}, user_id=user_id)
        db.add(conversation)
        await db.flush()
    else:
        _check_conversation_access(conversation, user_id)
        if conversation.user_id is None and user_id is not None:
            # Guest conversation continued after login — claim it for the user.
            conversation.user_id = user_id

    history: list[dict] = list(conversation.state.get("history", []))
    if user_message.strip():
        history.append({"role": "user", "content": user_message.strip()})

    system_prompt = (PROMPTS_DIR / "clarify.md").read_text(encoding="utf-8").format(
        keywords=", ".join(conversation.keywords or keywords) or "keine",
        max_turns=MAX_CLARIFY_TURNS,
    )
    messages = [ChatMessage(role="system", content=system_prompt)] + [
        ChatMessage(role=m["role"], content=m["content"]) for m in history
    ]
    if not history:
        messages.append(
            ChatMessage(role="user", content="Hallo Migo, ich möchte eine Reise planen!")
        )

    response = await openrouter.complete(messages=messages)
    reply = response.content.strip()

    # The marker must never leak into the UI, no matter how the model wraps it.
    ready_to_plan = READY_MARKER in reply
    assistant_turns = sum(1 for m in history if m["role"] == "assistant")
    if not ready_to_plan and assistant_turns + 1 >= MAX_CLARIFY_TURNS:
        ready_to_plan = True
    if ready_to_plan:
        reply = READY_REPLY

    history.append({"role": "assistant", "content": reply})
    conversation.state = {**conversation.state, "history": history}

    await db.commit()
    await db.refresh(conversation)
    return conversation, reply, ready_to_plan


async def generate_trip_proposals(
    db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> list[dict] | None:
    """2–3 compact destination proposals from the dialog. None if conversation unknown."""
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None:
        return None
    _check_conversation_access(conversation, user_id)
    history: list[dict] = list(conversation.state.get("history", []))

    prompt = (PROMPTS_DIR / "proposals.md").read_text(encoding="utf-8").format(
        today=date.today().isoformat(),
        keywords=", ".join(conversation.keywords or []) or "keine",
        history="\n".join(f"{m['role']}: {m['content']}" for m in history) or "kein Dialog",
    )
    response = await openrouter.complete(
        messages=[ChatMessage(role="user", content=prompt)],
        response_format={"type": "json_object"},
        max_tokens=1500,
        timeout_seconds=120.0,
    )
    data = _parse_plan_json(response.content)
    raw_proposals = data.get("proposals")
    if not isinstance(raw_proposals, list):
        raise openrouter.LLMServiceError("LLM proposals JSON has no 'proposals' list")

    proposals: list[dict] = []
    for entry in raw_proposals[:3]:
        if not isinstance(entry, dict) or not entry.get("destination"):
            continue
        proposals.append(
            {
                "destination": str(entry["destination"]),
                "timeframe": str(entry["timeframe"]) if entry.get("timeframe") else None,
                "estimated_budget": _parse_budget(entry.get("estimated_budget")),
                "highlights": [
                    str(h) for h in entry.get("highlights", []) if isinstance(h, (str, int, float))
                ][:4],
                "lat": _parse_float(entry.get("lat")),
                "lon": _parse_float(entry.get("lon")),
                "image_query": str(entry["image_query"]) if entry.get("image_query") else None,
            }
        )
    if not proposals:
        raise openrouter.LLMServiceError("LLM returned no usable proposals")

    # Stored on the conversation so /trips/plan can pick one by index.
    conversation.state = {**conversation.state, "proposals": proposals}
    await db.commit()
    return proposals


async def build_trip_plan(
    db: AsyncSession, request: TripPlanRequest, user_id: uuid.UUID | None = None
) -> TripPlan:
    conversation = await db.get(Conversation, request.conversation_id)
    if conversation is not None:
        _check_conversation_access(conversation, user_id)
    history: list[dict] = conversation.state.get("history", []) if conversation else []
    keywords = request.keywords or (conversation.keywords if conversation else [])

    selected_proposal: dict | None = None
    if conversation is not None and request.proposal_index is not None:
        stored = conversation.state.get("proposals") or []
        if 0 <= request.proposal_index < len(stored):
            selected_proposal = stored[request.proposal_index]

    search_results = await travel_api.search_all(flights=None, stays=None, activities=None)

    prompt = (PROMPTS_DIR / "compose.md").read_text(encoding="utf-8").format(
        keywords=", ".join(keywords) or "keine",
        history="\n".join(f"{m['role']}: {m['content']}" for m in history) or "kein Dialog",
        answers=json.dumps(request.answers, ensure_ascii=False),
        selected_proposal=(
            json.dumps(selected_proposal, ensure_ascii=False)
            if selected_proposal
            else "keiner — wähle selbst das am besten passende Ziel"
        ),
        search_results=json.dumps(
            {k: [item.model_dump() for item in v] for k, v in search_results.items()},
            ensure_ascii=False,
        ),
        today=date.today().isoformat(),
    )

    # Composing the full plan JSON can take minutes on slower models.
    response = await openrouter.complete(
        messages=[ChatMessage(role="user", content=prompt)],
        response_format={"type": "json_object"},
        max_tokens=4000,
        timeout_seconds=300.0,
    )
    plan_data = _parse_plan_json(response.content)

    trip_plan = TripPlan(
        conversation_id=request.conversation_id,
        destination=plan_data.get("destination") or "Unbekannt",
        start_date=_parse_date(plan_data.get("start_date")),
        end_date=_parse_date(plan_data.get("end_date")),
        budget=_parse_budget(plan_data.get("budget")),
        summary=plan_data.get("summary"),
        lat=_parse_float(plan_data.get("lat")),
        lon=_parse_float(plan_data.get("lon")),
    )
    db.add(trip_plan)
    await db.flush()

    for index, item in enumerate(plan_data.get("items", [])):
        item_type = item.get("type")
        if item_type not in VALID_ITEM_TYPES:
            continue
        db.add(
            TripItem(
                trip_plan_id=trip_plan.id,
                type=TripItemType(item_type),
                payload=item.get("payload", {}),
                day=_parse_int(item.get("day"), default=1),
                order=_parse_int(item.get("order"), default=index),
            )
        )

    await db.commit()
    return await _load_plan_with_items(db, trip_plan.id)


def _plan_to_dict(plan: TripPlan) -> dict:
    return {
        "destination": plan.destination,
        "start_date": plan.start_date.isoformat() if plan.start_date else None,
        "end_date": plan.end_date.isoformat() if plan.end_date else None,
        "budget": float(plan.budget) if plan.budget is not None else None,
        "summary": plan.summary,
        "items": [
            {
                "type": item.type.value,
                "day": item.day,
                "order": item.order,
                "payload": item.payload,
            }
            for item in plan.items
        ],
    }


async def revise_trip_plan(
    db: AsyncSession,
    trip_plan_id: uuid.UUID,
    change_request: str,
    user_id: uuid.UUID | None = None,
) -> TripPlan | None:
    """Apply a free-text change request to an existing plan. Returns None if unknown."""
    result = await db.execute(
        select(TripPlan).options(selectinload(TripPlan.items)).where(TripPlan.id == trip_plan_id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        return None

    conversation = await db.get(Conversation, plan.conversation_id)
    history: list[dict] = []
    if conversation is not None:
        _check_conversation_access(conversation, user_id)
        history = list(conversation.state.get("history", []))

    prompt = (PROMPTS_DIR / "revise.md").read_text(encoding="utf-8").format(
        today=date.today().isoformat(),
        current_plan=json.dumps(_plan_to_dict(plan), ensure_ascii=False),
        history="\n".join(f"{m['role']}: {m['content']}" for m in history) or "kein Dialog",
        change_request=change_request.strip(),
    )

    # Same budget as compose: full plan JSONs can take minutes on slow models.
    response = await openrouter.complete(
        messages=[ChatMessage(role="user", content=prompt)],
        response_format={"type": "json_object"},
        max_tokens=4000,
        timeout_seconds=300.0,
    )
    plan_data = _parse_plan_json(response.content)

    plan.destination = plan_data.get("destination") or plan.destination
    plan.start_date = _parse_date(plan_data.get("start_date")) or plan.start_date
    plan.end_date = _parse_date(plan_data.get("end_date")) or plan.end_date
    budget = _parse_budget(plan_data.get("budget"))
    if budget is not None:
        plan.budget = budget
    plan.summary = plan_data.get("summary") or plan.summary
    lat, lon = _parse_float(plan_data.get("lat")), _parse_float(plan_data.get("lon"))
    if lat is not None and lon is not None:
        plan.lat, plan.lon = lat, lon

    new_items = [
        item for item in plan_data.get("items", []) if item.get("type") in VALID_ITEM_TYPES
    ]
    # Never wipe the plan when the model returns no usable items.
    if new_items:
        await db.execute(delete(TripItem).where(TripItem.trip_plan_id == plan.id))
        for index, item in enumerate(new_items):
            db.add(
                TripItem(
                    trip_plan_id=plan.id,
                    type=TripItemType(item["type"]),
                    payload=item.get("payload", {}),
                    day=_parse_int(item.get("day"), default=1),
                    order=_parse_int(item.get("order"), default=index),
                )
            )

    if conversation is not None:
        history.append({"role": "user", "content": f"[Planänderung] {change_request.strip()}"})
        history.append({"role": "assistant", "content": "Ich habe den Reiseplan entsprechend angepasst."})
        conversation.state = {**conversation.state, "history": history}

    await db.commit()
    plan_id = plan.id  # read before expire — expired attributes would lazy-load synchronously
    db.expire(plan)  # session keeps objects alive (expire_on_commit=False) — force a fresh read
    return await _load_plan_with_items(db, plan_id)


async def _load_plan_with_items(db: AsyncSession, trip_plan_id: uuid.UUID) -> TripPlan:
    result = await db.execute(
        select(TripPlan).options(selectinload(TripPlan.items)).where(TripPlan.id == trip_plan_id)
    )
    return result.scalar_one()


def _parse_plan_json(content: str) -> dict:
    text = content.strip()
    # Some models wrap JSON in markdown fences despite response_format.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, flags=re.DOTALL)
    if fence:
        text = fence.group(1)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise openrouter.LLMServiceError(f"LLM returned invalid plan JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise openrouter.LLMServiceError("LLM plan JSON is not an object")
    return data


def _parse_date(value: object) -> date | None:
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _parse_budget(value: object) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = re.sub(r"[^\d,.]", "", value)
        if not cleaned:
            return None
        if "," in cleaned:
            # German format: dot = thousands, comma = decimals ("1.500,50").
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif cleaned.count(".") > 1 or (
            cleaned.count(".") == 1 and len(cleaned.rsplit(".", 1)[1]) == 3
        ):
            cleaned = cleaned.replace(".", "")
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _parse_float(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "."))
        except ValueError:
            return None
    return None


def _parse_int(value: object, default: int) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
