from pydantic import BaseModel


class Photo(BaseModel):
    url: str
    thumb_url: str
    alt: str
    # Unsplash attribution requirements: photographer name + links.
    author: str
    author_url: str
    source_url: str


class PhotoSearchResponse(BaseModel):
    photo: Photo | None = None
