from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Soundbite
from ..services.soundbites import pick_soundbites
from .meetings import get_meeting_or_404

router = APIRouter(tags=["soundbites"])


class SoundbiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    title: str
    start_sec: float
    end_sec: float


@router.get("/meetings/{meeting_id}/soundbites", response_model=list[SoundbiteOut])
def list_soundbites(meeting_id: int, db: Session = Depends(get_db)):
    get_meeting_or_404(db, meeting_id)
    return db.scalars(
        select(Soundbite).where(Soundbite.meeting_id == meeting_id).order_by(Soundbite.start_sec)
    ).all()


@router.post("/meetings/{meeting_id}/soundbites/generate", response_model=list[SoundbiteOut], status_code=201)
def generate_soundbites(meeting_id: int, top_n: int = 3, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(db, meeting_id)
    for old in list(meeting.soundbites):  # regenerate = replace
        db.delete(old)
    db.flush()
    created = [
        Soundbite(meeting_id=meeting_id, **sb)
        for sb in pick_soundbites(meeting.segments, max(1, min(top_n, 10)))
    ]
    db.add_all(created)
    db.commit()
    for sb in created:
        db.refresh(sb)
    return created


@router.delete("/soundbites/{soundbite_id}", status_code=204)
def delete_soundbite(soundbite_id: int, db: Session = Depends(get_db)):
    sb = db.get(Soundbite, soundbite_id)
    if not sb:
        raise HTTPException(status_code=404, detail="Soundbite not found")
    db.delete(sb)
    db.commit()
    return Response(status_code=204)