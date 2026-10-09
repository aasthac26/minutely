from datetime import datetime, date
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Index, Integer, String, Table, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

# Many-to-many: meetings <-> participants
meeting_participants = Table(
    "meeting_participants",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("participant_id", ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True),
)

# Many-to-many: meetings <-> tags
meeting_tags = Table(
    "meeting_tags",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Participant(Base):
    __tablename__ = "participants"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(200))


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True)


class Meeting(Base):
    __tablename__ = "meetings"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    meeting_date: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(20), default="seed")  # seed | upload | paste | form
    media_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    participants = relationship("Participant", secondary=meeting_participants, lazy="selectin")
    tags = relationship("Tag", secondary=meeting_tags, lazy="selectin")
    segments = relationship(
        "TranscriptSegment", back_populates="meeting",
        cascade="all, delete-orphan", order_by="TranscriptSegment.start_sec",
    )
    summary = relationship("Summary", back_populates="meeting", uselist=False,
                           cascade="all, delete-orphan")
    topics = relationship("Topic", cascade="all, delete-orphan", order_by="Topic.start_sec")
    action_items = relationship("ActionItem", cascade="all, delete-orphan",
                                back_populates="meeting")
    comments = relationship("Comment", cascade="all, delete-orphan")
    soundbites = relationship("Soundbite", cascade="all, delete-orphan")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    speaker_id: Mapped[int | None] = mapped_column(ForeignKey("participants.id", ondelete="SET NULL"))
    start_sec: Mapped[float] = mapped_column(Float)
    end_sec: Mapped[float] = mapped_column(Float)
    text: Mapped[str] = mapped_column(Text)

    meeting = relationship("Meeting", back_populates="segments")
    speaker = relationship("Participant", lazy="joined")

    __table_args__ = (Index("ix_segments_meeting_start", "meeting_id", "start_sec"),)


class Summary(Base):
    __tablename__ = "summaries"
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True)  # 1:1 with meeting
    overview: Mapped[str] = mapped_column(Text, default="")
    keywords: Mapped[str] = mapped_column(Text, default="")  # comma-separated

    meeting = relationship("Meeting", back_populates="summary")


class Topic(Base):  # chapters / outline
    __tablename__ = "topics"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    start_sec: Mapped[float] = mapped_column(Float)


class ActionItem(Base):
    __tablename__ = "action_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("participants.id", ondelete="SET NULL"))
    source_segment_id: Mapped[int | None] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="SET NULL"))  # click to jump to where it was said
    text: Mapped[str] = mapped_column(Text)
    due_date: Mapped[date | None] = mapped_column(Date)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)

    meeting = relationship("Meeting", back_populates="action_items")
    assignee = relationship("Participant", lazy="joined")


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    segment_id: Mapped[int | None] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Soundbite(Base):
    __tablename__ = "soundbites"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    start_sec: Mapped[float] = mapped_column(Float)
    end_sec: Mapped[float] = mapped_column(Float)