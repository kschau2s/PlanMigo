import json
import re
import uuid
from datetime import date
from pathlib import Path

from sqlalchemy import select
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
    "Ich stelle jetzt deinen persönlichen Reiseplan zusammen …"
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


async def build_trip_plan(
    db: AsyncSession, request: TripPlanRequest, user_id: uuid.UUID | None = None
) -> TripPlan:
    conversation = await db.get(Conversation, request.conversation_id)
    if conversation is not None:
        _check_conversation_access(conversation, user_id)
    history: list[dict] = conversation.state.get("history", []) if conversation else []
    keywords = request.keywords or (conversation.keywords if conversation else [])

    search_results = await travel_api.search_all(flights=None, stays=None, activities=None)

    prompt = (PROMPTS_DIR / "compose.md").read_text(encoding="utf-8").format(
        keywords=", ".join(keywords) or "keine",
        history="\n".join(f"{m['role']}: {m['content']}" for m in history) or "kein Dialog",
        answers=json.dumps(request.answers, ensure_ascii=False),
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


def _parse_int(value: object, default: int) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
