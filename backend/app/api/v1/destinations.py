from fastapi import APIRouter, HTTPException

from app.core.deps import DBSession
from app.schemas.destination import DestinationSuggestRequest, DestinationSuggestResponse
from app.services import destinations as destinations_service
from app.services.openrouter import LLMServiceError

router = APIRouter(tags=["destinations"])


@router.post("/destinations/suggest", response_model=DestinationSuggestResponse)
async def suggest_destinations(
    request: DestinationSuggestRequest, db: DBSession
) -> DestinationSuggestResponse:
    try:
        destinations = await destinations_service.suggest_destinations(
            db, request.conversation_id, request.keywords
        )
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return DestinationSuggestResponse(destinations=destinations)
