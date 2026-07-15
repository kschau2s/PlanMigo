import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DBSession, OptionalUser
from app.models.conversation import Conversation
from app.models.trip_plan import TripPlan
from app.schemas.trip import (
    TripPlanOut,
    TripPlanRequest,
    TripProposalsRequest,
    TripProposalsResponse,
    TripReviseRequest,
)
from app.services import planner
from app.services.openrouter import LLMServiceError

router = APIRouter(tags=["trips"])


@router.post("/trips/plan", response_model=TripPlanOut)
async def create_trip_plan(
    request: TripPlanRequest, db: DBSession, user: OptionalUser
) -> TripPlan:
    try:
        return await planner.build_trip_plan(db, request, user_id=user.id if user else None)
    except planner.ConversationAccessError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/trips/proposals", response_model=TripProposalsResponse)
async def create_trip_proposals(
    request: TripProposalsRequest, db: DBSession, user: OptionalUser
) -> TripProposalsResponse:
    try:
        proposals = await planner.generate_trip_proposals(
            db, request.conversation_id, user_id=user.id if user else None
        )
    except planner.ConversationAccessError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if proposals is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return TripProposalsResponse(proposals=proposals)


@router.post("/trips/{trip_id}/revise", response_model=TripPlanOut)
async def revise_trip_plan(
    trip_id: uuid.UUID, request: TripReviseRequest, db: DBSession, user: OptionalUser
) -> TripPlan:
    try:
        plan = await planner.revise_trip_plan(
            db, trip_id, request.message, user_id=user.id if user else None
        )
    except planner.ConversationAccessError as exc:
        raise HTTPException(status_code=404, detail="Trip plan not found") from exc
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if plan is None:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    return plan


@router.get("/trips", response_model=list[TripPlanOut])
async def list_trip_plans(db: DBSession, user: CurrentUser) -> list[TripPlan]:
    result = await db.execute(
        select(TripPlan)
        .join(Conversation, TripPlan.conversation_id == Conversation.id)
        .where(Conversation.user_id == user.id)
        .options(selectinload(TripPlan.items))
        .order_by(Conversation.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/trips/{trip_id}", response_model=TripPlanOut)
async def get_trip_plan(trip_id: uuid.UUID, db: DBSession, user: OptionalUser) -> TripPlan:
    result = await db.execute(
        select(TripPlan).options(selectinload(TripPlan.items)).where(TripPlan.id == trip_id)
    )
    trip_plan = result.scalar_one_or_none()
    if trip_plan is None:
        raise HTTPException(status_code=404, detail="Trip plan not found")

    conversation = await db.get(Conversation, trip_plan.conversation_id)
    if (
        conversation is not None
        and conversation.user_id is not None
        and (user is None or user.id != conversation.user_id)
    ):
        # Plans owned by an account are only visible to that account.
        raise HTTPException(status_code=404, detail="Trip plan not found")
    return trip_plan
