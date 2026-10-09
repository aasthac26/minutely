import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (registers tables)
from .db import Base, SessionLocal, engine
from .routers import action_items, comments, export, insights, meetings, search, soundbites
from .seed import seed_if_empty

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(title="Minutely API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router)
app.include_router(action_items.router)
app.include_router(search.router)
app.include_router(export.router)
app.include_router(insights.router)
app.include_router(comments.router)
app.include_router(soundbites.router)


@app.get("/health")
def health():
    return {"status": "ok"}