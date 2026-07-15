from fastapi import APIRouter, Query

from app.schemas.image import PhotoSearchResponse
from app.services import images

router = APIRouter(tags=["images"])


@router.get("/images", response_model=PhotoSearchResponse)
async def search_image(query: str = Query(min_length=2, max_length=200)) -> PhotoSearchResponse:
    return PhotoSearchResponse(photo=await images.search_photo(query))
