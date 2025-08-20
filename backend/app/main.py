from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import health, chats, uploads, automations

app = FastAPI(title="NexGen API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chats.router, prefix="/chats", tags=["chats"])
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
app.include_router(automations.router, prefix="/automations", tags=["automations"])
