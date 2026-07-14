import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import DBSession
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


@router.get("/trips/{trip_id}", response_model=TripPlanOut)
async def get_trip_plan(trip_id: uuid.UUID, db: DBSession) -> TripPlan:
    result = await db.execute(
        select(TripPlan).options(selectinload(TripPlan.items)).where(TripPlan.id == trip_id)
    )
    trip_plan = result.scalar_one_or_none()
    if trip_plan is None:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    return trip_plan
