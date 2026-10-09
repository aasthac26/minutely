from datetime import date, datetime, time
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Meeting, Participant, Tag
from ..schemas import (
    MeetingCreate, MeetingDetailOut, MeetingListOut, MeetingUpdate, TranscriptPaste,
)
from ..services.export import build_export
from ..services.ingest import ingest_transcript
from ..services.parser import parse_transcript
router = APIRouter(prefix="/meetings", tags=["meetings"])


def get_or_create(db: Session, model, names: list[str]):
    """Return rows for the given names, creating any that don't exist yet."""
    rows = []
    for name in {n.strip() for n in names if n.strip()}:
        row = db.scalar(select(model).where(model.name == name))
        if not row:
            row = model(name=name)
            db.add(row)
        rows.append(row)
    return rows


def get_meeting_or_404(db: Session, meeting_id: int) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.get("", response_model=list[MeetingListOut])
def list_meetings(
    q: str | None = None,
    participant: str | None = None,
    tag: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Literal["date_desc", "date_asc"] = "date_desc",
    db: Session = Depends(get_db),
):
    stmt = select(Meeting)
    if q:
        stmt = stmt.where(Meeting.title.ilike(f"%{q}%"))
    if participant:
        stmt = stmt.where(Meeting.participants.any(Participant.name.ilike(f"%{participant}%")))
    if tag:
        stmt = stmt.where(Meeting.tags.any(Tag.name == tag))
    if date_from:
        stmt = stmt.where(Meeting.meeting_date >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(Meeting.meeting_date <= datetime.combine(date_to, time.max))
    stmt = stmt.order_by(
        Meeting.meeting_date.desc() if sort == "date_desc" else Meeting.meeting_date.asc()
    )
    return db.scalars(stmt).all()


@router.post("", response_model=MeetingDetailOut, status_code=201)
def create_meeting(payload: MeetingCreate, db: Session = Depends(get_db)):
    meeting = Meeting(
        title=payload.title,
        meeting_date=payload.meeting_date or datetime.utcnow(),
        duration_sec=payload.duration_sec or 0,
        source="form",
    )
    meeting.participants = get_or_create(db, Participant, payload.participants)
    meeting.tags = get_or_create(db, Tag, payload.tags)
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting

MAX_UPLOAD_BYTES = 2 * 1024 * 1024


@router.post("/paste", response_model=MeetingDetailOut, status_code=201)
def create_from_paste(payload: TranscriptPaste, db: Session = Depends(get_db)):
    try:
        segments = parse_transcript(payload.filename_hint or "", payload.transcript_text)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return ingest_transcript(
        db, title=payload.title, meeting_date=payload.meeting_date or datetime.utcnow(),
        segments=segments, source="paste",
    )


@router.post("/upload", response_model=MeetingDetailOut, status_code=201)
async def create_from_upload(
    file: UploadFile = File(...),
    title: str = Form(...),
    meeting_date: datetime | None = Form(None),
    db: Session = Depends(get_db),
):
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 2 MB)")
    try:
        segments = parse_transcript(file.filename or "", raw.decode("utf-8-sig", errors="replace"))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return ingest_transcript(
        db, title=title, meeting_date=meeting_date or datetime.utcnow(),
        segments=segments, source="upload",
    )
@router.get("/{meeting_id}", response_model=MeetingDetailOut)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    return get_meeting_or_404(db, meeting_id)


@router.patch("/{meeting_id}", response_model=MeetingDetailOut)
def update_meeting(meeting_id: int, payload: MeetingUpdate, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(db, meeting_id)
    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"]:
        meeting.title = data["title"]
    if data.get("participants") is not None:
        meeting.participants = get_or_create(db, Participant, data["participants"])
    if data.get("tags") is not None:
        meeting.tags = get_or_create(db, Tag, data["tags"])
    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(db, meeting_id)
    db.delete(meeting)
    db.commit()
    return Response(status_code=204)