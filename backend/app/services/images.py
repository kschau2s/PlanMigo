"""Unsplash photo search — the only place that talks to the Unsplash API.

The access key stays server-side (Settings). Results are cached in-memory per
query because the Unsplash demo tier allows only 50 requests/hour — display-only
hotlinking with attribution, no download pings (they count against the quota).
"""

import logging
import time

import httpx

from app.config import get_settings
from app.schemas.image import Photo

logger = logging.getLogger(__name__)

UNSPLASH_API = "https://api.unsplash.com"
CACHE_TTL_SECONDS = 24 * 3600
_cache: dict[str, tuple[float, Photo | None]] = {}


async def search_photo(query: str) -> Photo | None:
    """Best landscape photo for a destination query, or None (no key / no hit / error)."""
    settings = get_settings()
    if not settings.UNSPLASH_ACCESS_KEY:
        return None

    key = query.strip().lower()
    cached = _cache.get(key)
    if cached and time.monotonic() - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    photo: Photo | None = None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{UNSPLASH_API}/search/photos",
                params={"query": query, "per_page": 1, "orientation": "landscape"},
                headers={"Authorization": f"Client-ID {settings.UNSPLASH_ACCESS_KEY}"},
            )
            response.raise_for_status()
            results = response.json().get("results", [])
            if results:
                result = results[0]
                photo = Photo(
                    url=result["urls"]["regular"],
                    thumb_url=result["urls"]["small"],
                    alt=result.get("alt_description") or query,
                    author=result["user"]["name"],
                    author_url=result["user"]["links"]["html"],
                    source_url=result["links"]["html"],
                )
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        logger.warning("Unsplash lookup failed for %r: %s", query, exc)
        return None  # do not cache transient errors

    _cache[key] = (time.monotonic(), photo)
    return photo
