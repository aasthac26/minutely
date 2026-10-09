from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Comment, TranscriptSegment
from .meetings import get_meeting_or_404

router = APIRouter(tags=["comments"])


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    segment_id: int | None = None  # attach the comment to a transcript moment


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    segment_id: int | None
    body: str
    created_at: datetime


@router.get("/meetings/{meeting_id}/comments", response_model=list[CommentOut])
def list_comments(meeting_id: int, db: Session = Depends(get_db)):
    get_meeting_or_404(db, meeting_id)
    return db.scalars(
        select(Comment).where(Comment.meeting_id == meeting_id).order_by(Comment.created_at)
    ).all()


@router.post("/meetings/{meeting_id}/comments", response_model=CommentOut, status_code=201)
def create_comment(meeting_id: int, payload: CommentCreate, db: Session = Depends(get_db)):
    get_meeting_or_404(db, meeting_id)
    if payload.segment_id is not None:
        seg = db.get(TranscriptSegment, payload.segment_id)
        if not seg or seg.meeting_id != meeting_id:
            raise HTTPException(status_code=422, detail="segment_id does not belong to this meeting")
    comment = Comment(
        meeting_id=meeting_id, segment_id=payload.segment_id, body=payload.body.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return Response(status_code=204)