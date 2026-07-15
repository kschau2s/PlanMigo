import pytest

from app.schemas.image import Photo
from app.services import images

pytestmark = pytest.mark.asyncio

PHOTO = Photo(
    url="https://images.unsplash.com/photo-1?w=1080",
    thumb_url="https://images.unsplash.com/photo-1?w=400",
    alt="Reisterrassen auf Bali",
    author="Jane Doe",
    author_url="https://unsplash.com/@janedoe",
    source_url="https://unsplash.com/photos/abc",
)


async def test_images_returns_photo(client, monkeypatch):
    async def fake_search(query):
        assert query == "Bali"
        return PHOTO

    monkeypatch.setattr(images, "search_photo", fake_search)

    response = await client.get("/api/v1/images", params={"query": "Bali"})
    assert response.status_code == 200
    photo = response.json()["photo"]
    assert photo["author"] == "Jane Doe"
    assert photo["thumb_url"].endswith("w=400")


async def test_images_returns_null_without_result(client, monkeypatch):
    async def fake_search(query):
        return None

    monkeypatch.setattr(images, "search_photo", fake_search)

    response = await client.get("/api/v1/images", params={"query": "xyzzy"})
    assert response.status_code == 200
    assert response.json()["photo"] is None


async def test_images_rejects_short_query(client):
    response = await client.get("/api/v1/images", params={"query": "x"})
    assert response.status_code == 422
