from datetime import date

from pydantic import BaseModel


class FlightSearchRequest(BaseModel):
    origin: str
    destination: str
    departure_date: date
    return_date: date | None = None
    adults: int = 1


class StaySearchRequest(BaseModel):
    destination: str
    check_in: date
    check_out: date
    guests: int = 1


class ActivitySearchRequest(BaseModel):
    destination: str
    date_from: date | None = None
    date_to: date | None = None
    interests: list[str] = []


class SearchResultItem(BaseModel):
    provider: str
    title: str
    price: float | None = None
    currency: str = "EUR"
    payload: dict = {}


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
