from fastapi import APIRouter

from app.schemas.search import (
    ActivitySearchRequest,
    FlightSearchRequest,
    SearchResponse,
    StaySearchRequest,
)
from app.services import travel_api

router = APIRouter(tags=["search"])


@router.post("/search/flights", response_model=SearchResponse)
async def search_flights(request: FlightSearchRequest) -> SearchResponse:
    results = await travel_api.search_flights(request)
    return SearchResponse(results=results)


@router.post("/search/stays", response_model=SearchResponse)
async def search_stays(request: StaySearchRequest) -> SearchResponse:
    results = await travel_api.search_stays(request)
    return SearchResponse(results=results)


@router.post("/search/activities", response_model=SearchResponse)
async def search_activities(request: ActivitySearchRequest) -> SearchResponse:
    results = await travel_api.search_activities(request)
    return SearchResponse(results=results)
