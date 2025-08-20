from fastapi import APIRouter
from ..schemas.chat import ChatMessageIn, ChatMessageOut

router = APIRouter()

@router.post("/{chat_id}/messages", response_model=ChatMessageOut)
def post_message(chat_id: str, payload: ChatMessageIn):
    # stubbed response
    return ChatMessageOut(
        id="msg_123",
        chat_id=chat_id,
        text=payload.text,
        display_role=payload.display_role,
        actor_type="trainer",
        created_at="2025-08-20T12:00:00Z",
        status="sent"
    )
