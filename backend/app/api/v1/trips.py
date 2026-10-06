import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DBSession
from app.models.conversation import Conversation
from app.models.trip_plan import TripPlan
from app.schemas.trip import TripPlanOut, TripPlanRequest
from app.services import planner
from app.services.openrouter import LLMServiceError

router = APIRouter(tags=["trips"])


@router.post("/trips/plan", response_model=TripPlanOut)
async def create_trip_plan(request: TripPlanRequest, db: DBSession) -> TripPlan:
    try:
        return await planner.build_trip_plan(db, request)
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/trips/mine", response_model=list[TripPlanOut])
async def list_my_trips(db: DBSession, user: CurrentUser) -> list[TripPlan]:
    result = await db.execute(
        select(TripPlan)
        .join(Conversation, TripPlan.conversation_id == Conversation.id)
        .where(Conversation.user_id == user.id)
        .options(selectinload(TripPlan.items))
        .order_by(Conversation.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/trips/{trip_id}", response_model=TripPlanOut)
async def get_trip_plan(trip_id: uuid.UUID, db: DBSession) -> TripPlan:
    result = await db.execute(
        select(TripPlan).options(selectinload(TripPlan.items)).where(TripPlan.id == trip_id)
    )
    trip_plan = result.scalar_one_or_none()
    if trip_plan is None:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    return trip_plan
