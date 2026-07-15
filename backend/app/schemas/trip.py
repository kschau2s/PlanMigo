import uuid
from datetime import date

from pydantic import BaseModel, Field

from app.models.trip_item import TripItemType


class TripPlanRequest(BaseModel):
    conversation_id: uuid.UUID
    keywords: list[str] = []
    answers: dict[str, str] = {}
    # Index into the proposals stored on the conversation (POST /trips/proposals).
    proposal_index: int | None = Field(default=None, ge=0)


class TripProposal(BaseModel):
    destination: str
    timeframe: str | None = None
    estimated_budget: float | None = None
    highlights: list[str] = []
    lat: float | None = None
    lon: float | None = None
    image_query: str | None = None


class TripProposalsRequest(BaseModel):
    conversation_id: uuid.UUID


class TripProposalsResponse(BaseModel):
    proposals: list[TripProposal]


class TripReviseRequest(BaseModel):
    # Free-text change request, e.g. "Ersetze Tag 2 durch einen Kochkurs".
    message: str = Field(min_length=1, max_length=2000)


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
    lat: float | None = None
    lon: float | None = None
    items: list[TripItemOut] = []

    model_config = {"from_attributes": True}
