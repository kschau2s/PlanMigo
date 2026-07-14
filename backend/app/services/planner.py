import json
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.trip_item import TripItem
from app.models.trip_plan import TripPlan
from app.schemas.chat import ChatMessage
from app.schemas.trip import TripPlanRequest
from app.services import openrouter, travel_api

PROMPTS_DIR = Path(__file__).parent / "prompts"


async def next_clarifying_turn(
    db: AsyncSession, conversation_id: uuid.UUID | None, keywords: list[str], user_message: str
) -> tuple[Conversation, str, bool]:
    conversation = None
    if conversation_id is not None:
        conversation = await db.get(Conversation, conversation_id)

    if conversation is None:
        conversation = Conversation(keywords=keywords, state={"history": []})
        db.add(conversation)
        await db.flush()

    history: list[dict] = conversation.state.get("history", [])
    history.append({"role": "user", "content": user_message})

    prompt_template = (PROMPTS_DIR / "clarify.md").read_text(encoding="utf-8")
    prompt = prompt_template.format(
        keywords=", ".join(conversation.keywords or keywords),
        history="\n".join(f"{m['role']}: {m['content']}" for m in history),
    )

    response = await openrouter.complete(messages=[ChatMessage(role="user", content=prompt)])
    reply = response.content.strip()
    ready_to_plan = reply == "READY_TO_PLAN"

    history.append({"role": "assistant", "content": reply})
    conversation.state = {**conversation.state, "history": history}

    await db.commit()
    await db.refresh(conversation)
    return conversation, reply, ready_to_plan


async def build_trip_plan(db: AsyncSession, request: TripPlanRequest) -> TripPlan:
    search_results = await travel_api.search_all(
        flights=None,
        stays=None,
        activities=None,
    )

    prompt_template = (PROMPTS_DIR / "compose.md").read_text(encoding="utf-8")
    prompt = prompt_template.format(
        keywords=", ".join(request.keywords),
        answers=json.dumps(request.answers, ensure_ascii=False),
        search_results=json.dumps(
            {k: [item.model_dump() for item in v] for k, v in search_results.items()}
        ),
    )

    response = await openrouter.complete(
        messages=[ChatMessage(role="user", content=prompt)],
        response_format={"type": "json_object"},
    )
    plan_data = json.loads(response.content)

    trip_plan = TripPlan(
        conversation_id=request.conversation_id,
        destination=plan_data.get("destination", "Unbekannt"),
        start_date=plan_data.get("start_date"),
        end_date=plan_data.get("end_date"),
        budget=plan_data.get("budget"),
        summary=plan_data.get("summary"),
    )
    db.add(trip_plan)
    await db.flush()

    for item in plan_data.get("items", []):
        db.add(
            TripItem(
                trip_plan_id=trip_plan.id,
                type=item["type"],
                payload=item.get("payload", {}),
                day=item.get("day", 1),
                order=item.get("order", 0),
            )
        )

    await db.commit()
    await db.refresh(trip_plan)
    return trip_plan
