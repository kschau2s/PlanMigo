from fastapi import APIRouter, HTTPException

from app.schemas.flight import FlightSuggestRequest, FlightSuggestResponse
from app.services import flights as flights_service
from app.services.openrouter import LLMServiceError

router = APIRouter(tags=["flights"])


@router.post("/flights/suggest", response_model=FlightSuggestResponse)
async def suggest_flights(request: FlightSuggestRequest) -> FlightSuggestResponse:
    try:
        flights = await flights_service.suggest_flights(request.keywords)
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return FlightSuggestResponse(flights=flights)
