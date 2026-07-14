from fastapi import APIRouter, HTTPException

from app.core.deps import DBSession
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import planner
from app.services.openrouter import LLMServiceError

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: DBSession) -> ChatResponse:
    try:
        conversation, reply, ready = await planner.next_clarifying_turn(
            db=db,
            conversation_id=request.conversation_id,
            keywords=request.keywords,
            user_message=request.message,
        )
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return ChatResponse(conversation_id=conversation.id, reply=reply, ready_to_plan=ready)
