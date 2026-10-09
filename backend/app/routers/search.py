from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Meeting, Participant, Tag, TranscriptSegment
from ..schemas import ParticipantOut, SearchHit, TagOut

router = APIRouter(tags=["search"])


def make_snippet(text: str, q: str, pad: int = 60) -> str:
    i = text.lower().find(q.lower())
    if i < 0:
        return text[:2 * pad]
    start, end = max(0, i - pad), min(len(text), i + len(q) + pad)
    return ("…" if start else "") + text[start:end] + ("…" if end < len(text) else "")


@router.get("/search", response_model=list[SearchHit])
def global_search(q: str = Query(..., min_length=2), limit: int = 40, db: Session = Depends(get_db)):
    stmt = (
        select(TranscriptSegment, Meeting)
        .join(Meeting, Meeting.id == TranscriptSegment.meeting_id)
        .where(TranscriptSegment.text.ilike(f"%{q}%"))
        .order_by(Meeting.meeting_date.desc(), TranscriptSegment.start_sec)
        .limit(limit)
    )
    return [
        SearchHit(
            meeting_id=m.id, meeting_title=m.title, meeting_date=m.meeting_date,
            segment_id=seg.id, start_sec=seg.start_sec,
            speaker=seg.speaker.name if seg.speaker else None,
            snippet=make_snippet(seg.text, q),
        )
        for seg, m in db.execute(stmt)
    ]


@router.get("/tags", response_model=list[TagOut])
def list_tags(db: Session = Depends(get_db)):
    return db.scalars(select(Tag).order_by(Tag.name)).all()


@router.get("/participants", response_model=list[ParticipantOut])
def list_participants(db: Session = Depends(get_db)):
    return db.scalars(select(Participant).order_by(Participant.name)).all()