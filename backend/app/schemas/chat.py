import uuid
from typing import Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID | None = None
    keywords: list[str] = []
    # Empty message starts a conversation: Migo asks the first question from the keywords.
    message: str = ""


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    reply: str
    ready_to_plan: bool = False
