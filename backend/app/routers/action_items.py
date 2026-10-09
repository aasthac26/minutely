from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ActionItem, Participant
from ..schemas import (
    ActionItemCreate, ActionItemListOut, ActionItemOut, ActionItemUpdate,
)
from .meetings import get_meeting_or_404, get_or_create

router = APIRouter(tags=["action-items"])


def get_item_or_404(db: Session, item_id: int) -> ActionItem:
    item = db.get(ActionItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    return item


def resolve_assignee(db: Session, name: str | None):
    if not name or not name.strip():
        return None
    return get_or_create(db, Participant, [name])[0]


@router.get("/action-items", response_model=list[ActionItemListOut])
def list_action_items(
    is_done: bool | None = None, assignee: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(ActionItem).order_by(ActionItem.is_done, ActionItem.due_date)
    if is_done is not None:
        stmt = stmt.where(ActionItem.is_done == is_done)
    if assignee:
        stmt = stmt.where(ActionItem.assignee.has(Participant.name.ilike(f"%{assignee}%")))
    return [
        ActionItemListOut(
            **ActionItemOut.model_validate(i).model_dump(),
            meeting_id=i.meeting_id, meeting_title=i.meeting.title,
        )
        for i in db.scalars(stmt).all()
    ]


@router.post("/meetings/{meeting_id}/action-items", response_model=ActionItemOut, status_code=201)
def create_action_item(meeting_id: int, payload: ActionItemCreate, db: Session = Depends(get_db)):
    get_meeting_or_404(db, meeting_id)
    item = ActionItem(
        meeting_id=meeting_id, text=payload.text, due_date=payload.due_date,
        source_segment_id=payload.source_segment_id,
        assignee=resolve_assignee(db, payload.assignee),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/action-items/{item_id}", response_model=ActionItemOut)
def update_action_item(item_id: int, payload: ActionItemUpdate, db: Session = Depends(get_db)):
    item = get_item_or_404(db, item_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("text"):
        item.text = data["text"]
    if "due_date" in data:
        item.due_date = data["due_date"]
    if "is_done" in data and data["is_done"] is not None:
        item.is_done = data["is_done"]
    if "assignee" in data:
        item.assignee = resolve_assignee(db, data["assignee"])
    db.commit()
    db.refresh(item)
    return item


@router.delete("/action-items/{item_id}", status_code=204)
def delete_action_item(item_id: int, db: Session = Depends(get_db)):
    db.delete(get_item_or_404(db, item_id))
    db.commit()
    return Response(status_code=204)