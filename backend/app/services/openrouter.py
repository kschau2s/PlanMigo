import asyncio

import httpx
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.schemas.chat import ChatMessage

MAX_RETRIES = 3
TIMEOUT_SECONDS = 60.0


class LLMServiceError(Exception):
    pass


class LLMResponse(BaseModel):
    content: str
    model: str
    raw: dict


async def complete(
    messages: list[ChatMessage],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2000,
    response_format: dict | None = None,
    settings: Settings | None = None,
) -> LLMResponse:
    settings = settings or get_settings()
    resolved_model = model or settings.OPENROUTER_MODEL

    body: dict = {
        "model": resolved_model,
        "messages": [m.model_dump() for m in messages],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format is not None:
        body["response_format"] = response_format

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": settings.OPENROUTER_SITE_URL,
        "X-Title": settings.OPENROUTER_APP_NAME,
    }

    last_error: Exception | None = None
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    json=body,
                    headers=headers,
                )
                if response.status_code == 429 or response.status_code >= 500:
                    last_error = LLMServiceError(f"OpenRouter status {response.status_code}")
                    await asyncio.sleep(2**attempt)
                    continue
                response.raise_for_status()
                data = response.json()
                return LLMResponse(
                    content=data["choices"][0]["message"]["content"],
                    model=data.get("model", resolved_model),
                    raw=data,
                )
            except httpx.HTTPError as exc:
                last_error = exc
                await asyncio.sleep(2**attempt)

    raise LLMServiceError(f"OpenRouter request failed after {MAX_RETRIES} attempts") from last_error
