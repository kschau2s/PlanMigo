import uuid

from pydantic import BaseModel


class DestinationSuggestRequest(BaseModel):
    conversation_id: uuid.UUID
    keywords: list[str] = []


class DestinationCandidate(BaseModel):
    id: str
    name: str
    country: str
    lat: float
    lng: float
    reason: str | None = None


class DestinationSuggestResponse(BaseModel):
    destinations: list[DestinationCandidate]
