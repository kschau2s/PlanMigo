import asyncio

import httpx

from app.config import Settings, get_settings
from app.schemas.search import (
    ActivitySearchRequest,
    FlightSearchRequest,
    SearchResultItem,
    StaySearchRequest,
)


class TravelAPIError(Exception):
    pass


async def search_flights(
    request: FlightSearchRequest, settings: Settings | None = None
) -> list[SearchResultItem]:
    settings = settings or get_settings()
    # Placeholder: Amadeus-Anbindung folgt (Auth via AMADEUS_API_KEY/SECRET).
    return []


async def search_stays(
    request: StaySearchRequest, settings: Settings | None = None
) -> list[SearchResultItem]:
    settings = settings or get_settings()
    # Placeholder: Booking-Affiliate-Anbindung folgt.
    return []


async def search_activities(
    request: ActivitySearchRequest, settings: Settings | None = None
) -> list[SearchResultItem]:
    settings = settings or get_settings()
    # Placeholder: GetYourGuide-Anbindung folgt.
    return []


async def search_all(
    flights: FlightSearchRequest | None,
    stays: StaySearchRequest | None,
    activities: ActivitySearchRequest | None,
    settings: Settings | None = None,
) -> dict[str, list[SearchResultItem]]:
    settings = settings or get_settings()
    tasks = {
        "flights": search_flights(flights, settings) if flights else _empty(),
        "stays": search_stays(stays, settings) if stays else _empty(),
        "activities": search_activities(activities, settings) if activities else _empty(),
    }
    results = await asyncio.gather(*tasks.values())
    return dict(zip(tasks.keys(), results))


async def _empty() -> list[SearchResultItem]:
    return []
