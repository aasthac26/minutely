import re
from collections import Counter
from math import log

from .export import fmt_ts

STOP = set(
    "a an the is are was were be been am do does did of to in on at for with about and or but if so as "
    "it its this that these those i you he she we they me my our your their what who whom which when "
    "where why how can could should would will shall may might any all there here from by not no yes "
    "please tell said say says discuss discussed meeting".split()
)
ACTION_RE = re.compile(r"action item|to-?do|\btasks?\b|follow.?ups?|next steps?|deadline|\bdue\b|assigned", re.I)
SUMMARY_RE = re.compile(r"summar|overview|tl;?dr|recap|key points|what (was|is) (this|the) (meeting|call) about", re.I)


def _stem(w: str) -> str:
    for suf in ("ing", "ed", "es", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[: -len(suf)]
    return w


def _tokens(text: str) -> list[str]:
    return [_stem(w) for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOP and len(w) > 1]


def _speaker(seg) -> str:
    return seg.speaker.name if seg.speaker else "Unknown"


def _ref(seg, score: float | None = None) -> dict:
    ref = {
        "segment_id": seg.id, "start_sec": seg.start_sec, "timestamp": fmt_ts(seg.start_sec),
        "speaker": _speaker(seg), "text": seg.text,
    }
    if score is not None:
        ref["score"] = round(score, 2)
    return ref


def answer_question(meeting, question: str, top_k: int = 3) -> dict:
    q = question.strip()
    segs = sorted(meeting.segments, key=lambda s: s.start_sec)
    by_id = {s.id: s for s in segs}

    if SUMMARY_RE.search(q) and meeting.summary:
        lines = [meeting.summary.overview]
        if meeting.topics:
            lines.append("Topics: " + "; ".join(t.title for t in meeting.topics))
        return {"answer": "\n".join(lines), "intent": "summary", "sources": []}

    if ACTION_RE.search(q):
        names = [p.name for p in meeting.participants if p.name.lower() in q.lower()]
        items = [a for a in meeting.action_items
                 if not names or (a.assignee and a.assignee.name in names)]
        if not items:
            return {"answer": "No matching action items in this meeting.", "intent": "action_items", "sources": []}
        lines = []
        for a in items:
            who = f" ({a.assignee.name})" if a.assignee else ""
            due = f", due {a.due_date}" if a.due_date else ""
            lines.append(f"- [{'done' if a.is_done else 'open'}] {a.text}{who}{due}")
        sources = [_ref(by_id[a.source_segment_id]) for a in items if a.source_segment_id in by_id]
        return {"answer": "\n".join(lines), "intent": "action_items", "sources": sources}

    q_tokens = set(_tokens(q))
    docs = [set(_tokens(f"{_speaker(s)} {s.text}")) for s in segs]
    if not q_tokens or not docs:
        return {"answer": "I couldn't find anything about that in this meeting.", "intent": "search", "sources": []}

    df = Counter(t for d in docs for t in d)
    n = len(docs)
    scored = sorted(
        ((sum(log(1 + n / (1 + df[t])) for t in q_tokens & d), s) for d, s in zip(docs, segs)),
        key=lambda x: x[0], reverse=True,
    )
    hits = [(sc, s) for sc, s in scored[:top_k] if sc > 0]
    if not hits:
        return {"answer": "I couldn't find anything about that in this meeting.", "intent": "search", "sources": []}

    lines = [f'{_speaker(s)} ({fmt_ts(s.start_sec)}): "{s.text}"' for _, s in hits]
    return {
        "answer": "Most relevant moments:\n" + "\n".join(lines),
        "intent": "search",
        "sources": [_ref(s, sc) for sc, s in hits],
    }