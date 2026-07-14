import uuid
from datetime import date

from pydantic import BaseModel

from app.models.trip_item import TripItemType


class TripPlanRequest(BaseModel):
    conversation_id: uuid.UUID
    keywords: list[str] = []
    answers: dict[str, str] = {}


class TripItemOut(BaseModel):
    id: uuid.UUID
    type: TripItemType
    payload: dict
    day: int
    order: int

    model_config = {"from_attributes": True}


class TripPlanOut(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    destination: str
    start_date: date | None
    end_date: date | None
    budget: float | None
    summary: str | None
    items: list[TripItemOut] = []

    model_config = {"from_attributes": True}
