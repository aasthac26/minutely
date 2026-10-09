from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import ActionItem, Meeting, Participant, Summary, Topic, TranscriptSegment
from .parser import ParsedSegment
from .summarizer import summarize


def ingest_transcript(
    db: Session, *, title: str, meeting_date: datetime,
    segments: list[ParsedSegment], source: str,
) -> Meeting:
    """Turn parsed segments into a full meeting: participants, transcript, summary, topics, action items."""
    names = list(dict.fromkeys(s.speaker for s in segments))
    result = summarize(segments, names, meeting_date.date())

    people: dict[str, Participant] = {}
    for name in names:
        people[name] = db.scalar(select(Participant).where(Participant.name == name)) or Participant(name=name)

    meeting = Meeting(
        title=title, meeting_date=meeting_date,
        duration_sec=int(max(s.end for s in segments)), source=source,
    )
    meeting.participants = list(people.values())
    db.add(meeting)
    db.flush()

    rows = [
        TranscriptSegment(meeting_id=meeting.id, speaker=people[s.speaker],
                          start_sec=s.start, end_sec=s.end, text=s.text)
        for s in segments
    ]
    db.add_all(rows)
    db.flush()  # rows now have ids, so action items can point at the exact segment

    meeting.summary = Summary(overview=result["overview"], keywords=", ".join(result["keywords"]))
    meeting.topics = [Topic(title=t["title"], start_sec=t["start_sec"]) for t in result["topics"]]
    for a in result["action_items"]:
        db.add(ActionItem(
            meeting_id=meeting.id, text=a["text"], due_date=a["due_date"],
            assignee=people.get(a["assignee"]),
            source_segment_id=rows[a["segment_index"]].id,
        ))

    db.commit()
    db.refresh(meeting)
    return meeting