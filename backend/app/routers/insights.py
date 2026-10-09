from collections import defaultdict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Meeting
from ..services.analytics import compute_analytics
from ..services.qa import answer_question
from .meetings import get_meeting_or_404
from ..services.llm import llm_enabled, write_answer
router = APIRouter(tags=["insights"])


class AskIn(BaseModel):
    question: str = Field(min_length=3, max_length=500)


@router.get("/meetings/{meeting_id}/analytics")
def meeting_analytics(meeting_id: int, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(db, meeting_id)
    return {"meeting_id": meeting.id, "title": meeting.title, **compute_analytics(meeting)}


@router.post("/meetings/{meeting_id}/ask")
def ask_meeting(meeting_id: int, payload: AskIn, db: Session = Depends(get_db)):
    meeting = get_meeting_or_404(db, meeting_id)
    result = answer_question(meeting, payload.question)
    
    if result["sources"] and llm_enabled():
        text = write_answer(meeting.title, payload.question, result["sources"])
        if text:
            result = {**result, "answer": text, "generated": True}
    return result

@router.get("/analytics/overview")
def overview(db: Session = Depends(get_db)):
    meetings = db.scalars(select(Meeting)).all()
    words: dict[str, int] = defaultdict(int)
    total_sec, open_items, done_items = 0.0, 0, 0
    for m in meetings:
        total_sec += float(m.duration_sec or 0)
        for a in m.action_items:
            if a.is_done:
                done_items += 1
            else:
                open_items += 1
        for sp in compute_analytics(m)["speakers"]:
            words[sp["name"]] += sp["words"]
    total_items = open_items + done_items
    return {
        "meetings": len(meetings),
        "total_hours": round(total_sec / 3600, 2),
        "action_items": {"open": open_items, "done": done_items},
        "completion_pct": round(100 * done_items / total_items, 1) if total_items else 0,
        "top_speakers": [
            {"name": n, "words": w} for n, w in sorted(words.items(), key=lambda x: x[1], reverse=True)[:5]
        ],
    }