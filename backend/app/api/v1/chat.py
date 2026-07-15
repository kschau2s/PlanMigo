from fastapi import APIRouter, HTTPException

from app.core.deps import DBSession, OptionalUser
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import planner
from app.services.openrouter import LLMServiceError

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: DBSession, user: OptionalUser) -> ChatResponse:
    try:
        conversation, reply, ready = await planner.next_clarifying_turn(
            db=db,
            conversation_id=request.conversation_id,
            keywords=request.keywords,
            user_message=request.message,
            user_id=user.id if user else None,
        )
    except planner.ConversationAccessError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return ChatResponse(conversation_id=conversation.id, reply=reply, ready_to_plan=ready)
