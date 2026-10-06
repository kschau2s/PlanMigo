import asyncio
import json
import re

import httpx
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.schemas.chat import ChatMessage

MAX_RETRIES = 3
TIMEOUT_SECONDS = 60.0


class LLMServiceError(Exception):
    pass


def parse_json_object(content: str) -> dict:
    """Unwrap a model's JSON reply, tolerating markdown code fences."""
    text = content.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, flags=re.DOTALL)
    if fence:
        text = fence.group(1)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LLMServiceError(f"LLM returned invalid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise LLMServiceError("LLM JSON is not an object")
    return data


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
    reasoning: dict | None = None,
    timeout_seconds: float = TIMEOUT_SECONDS,
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
    if reasoning is not None:
        body["reasoning"] = reasoning

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": settings.OPENROUTER_SITE_URL,
        "X-Title": settings.OPENROUTER_APP_NAME,
    }

    last_error: Exception | None = None
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
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
                if response.status_code >= 400:
                    # Client errors (bad key, unknown model, …) won't heal — fail fast.
                    raise LLMServiceError(
                        f"OpenRouter status {response.status_code}: {response.text[:300]}"
                    )
                data = response.json()
                message = data["choices"][0]["message"]
                content = message.get("content")
                if not content:
                    # Reasoning models can burn the whole max_tokens budget on
                    # hidden reasoning and return no content (finish_reason "length").
                    finish_reason = data["choices"][0].get("finish_reason")
                    raise LLMServiceError(
                        f"OpenRouter returned empty content (finish_reason={finish_reason})"
                    )
                return LLMResponse(
                    content=content,
                    model=data.get("model", resolved_model),
                    raw=data,
                )
            except httpx.HTTPError as exc:
                last_error = exc
                await asyncio.sleep(2**attempt)

    raise LLMServiceError(f"OpenRouter request failed after {MAX_RETRIES} attempts") from last_error
