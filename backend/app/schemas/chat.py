from pydantic import BaseModel, Field

class ChatMessageIn(BaseModel):
    text: str
    display_role: str = Field(regex="^(coach|trainer|client)$")

class ChatMessageOut(BaseModel):
    id: str
    chat_id: str
    text: str
    display_role: str
    actor_type: str
    created_at: str
    status: str
