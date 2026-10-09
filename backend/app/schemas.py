from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ParticipantOut(ORM):
    id: int
    name: str
    email: str | None = None


class TagOut(ORM):
    id: int
    name: str


class SegmentOut(ORM):
    id: int
    start_sec: float
    end_sec: float
    text: str
    speaker: ParticipantOut | None = None


class TopicOut(ORM):
    id: int
    title: str
    start_sec: float


class ActionItemOut(ORM):
    id: int
    text: str
    due_date: date | None = None
    is_done: bool
    source_segment_id: int | None = None
    assignee: ParticipantOut | None = None


class SummaryOut(ORM):
    overview: str
    keywords: str  # comma-separated, the frontend splits it


class MeetingListOut(ORM):
    id: int
    title: str
    meeting_date: datetime
    duration_sec: int
    source: str
    participants: list[ParticipantOut]
    tags: list[TagOut]


class MeetingDetailOut(MeetingListOut):
    media_url: str | None = None
    summary: SummaryOut | None = None
    topics: list[TopicOut] = []
    action_items: list[ActionItemOut] = []
    segments: list[SegmentOut] = []


class MeetingCreate(BaseModel):
    title: str
    meeting_date: datetime | None = None
    duration_sec: int | None = None
    participants: list[str] = []
    tags: list[str] = []


class MeetingUpdate(BaseModel):
    title: str | None = None
    participants: list[str] | None = None
    tags: list[str] | None = None

class TranscriptPaste(BaseModel):
    title: str
    transcript_text: str
    meeting_date: datetime | None = None
    filename_hint: str | None = None  # e.g. "call.vtt" to force a format

class ActionItemCreate(BaseModel):
    text: str
    assignee: str | None = None
    due_date: date | None = None
    source_segment_id: int | None = None


class ActionItemUpdate(BaseModel):
    text: str | None = None
    assignee: str | None = None  # send null to unassign
    due_date: date | None = None
    is_done: bool | None = None


class ActionItemListOut(ActionItemOut):
    meeting_id: int
    meeting_title: str


class SearchHit(BaseModel):
    meeting_id: int
    meeting_title: str
    meeting_date: datetime
    segment_id: int
    start_sec: float
    speaker: str | None = None
    snippet: str