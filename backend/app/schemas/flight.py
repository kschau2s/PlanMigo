from pydantic import BaseModel


class FlightSuggestRequest(BaseModel):
    keywords: list[str] = []


class FlightOption(BaseModel):
    id: str
    airline: str
    destination: str
    depart_month: str | None = None
    duration: str | None = None
    stops: str | None = None
    price: float
    note: str | None = None


class FlightSuggestResponse(BaseModel):
    flights: list[FlightOption]
