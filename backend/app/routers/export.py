import csv
import io
import re
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ActionItem
from ..services.export import build_export
from .meetings import get_meeting_or_404

router = APIRouter(tags=["export"])


def _safe(name: str) -> str:
    return re.sub(r"[^\w\-]+", "_", name).strip("_") or "meeting"


def _as_dict(m) -> dict:
    return {
        "id": m.id, "title": m.title, "meeting_date": m.meeting_date.isoformat(),
        "duration_sec": m.duration_sec,
        "participants": [p.name for p in m.participants],
        "summary": m.summary.overview if m.summary else None,
        "topics": [{"title": t.title, "start_sec": t.start_sec} for t in m.topics],
        "action_items": [
            {
                "text": a.text, "assignee": a.assignee.name if a.assignee else None,
                "due_date": a.due_date.isoformat() if a.due_date else None, "is_done": a.is_done,
            }
            for a in m.action_items
        ],
        "transcript": [
            {"speaker": s.speaker.name if s.speaker else None, "start_sec": s.start_sec, "text": s.text}
            for s in sorted(m.segments, key=lambda s: s.start_sec)
        ],
    }


@router.get("/meetings/{meeting_id}/export")
def export_meeting(
    meeting_id: int, format: Literal["md", "txt", "json"] = "md", db: Session = Depends(get_db),
):
    m = get_meeting_or_404(db, meeting_id)
    headers = {"Content-Disposition": f'attachment; filename="{_safe(m.title)}.{format}"'}
    if format == "json":
        return JSONResponse(_as_dict(m), headers=headers)
    return PlainTextResponse(build_export(m, format), headers=headers)


@router.get("/export/action-items")
def export_action_items(is_done: bool | None = None, db: Session = Depends(get_db)):
    stmt = select(ActionItem).order_by(ActionItem.is_done, ActionItem.due_date)
    if is_done is not None:
        stmt = stmt.where(ActionItem.is_done == is_done)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "meeting", "action_item", "assignee", "due_date", "status"])
    for a in db.scalars(stmt):
        w.writerow([
            a.id, a.meeting.title, a.text, a.assignee.name if a.assignee else "",
            a.due_date or "", "done" if a.is_done else "open",
        ])
    return Response(
        buf.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="action_items.csv"'},
    )