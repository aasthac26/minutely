from collections import defaultdict
from datetime import date

WORDS_PER_SEC = 2.5


def _name(seg) -> str:
    return seg.speaker.name if seg.speaker else "Unknown"


def compute_analytics(meeting) -> dict:
    segs = sorted(meeting.segments, key=lambda s: s.start_sec)
    stats = defaultdict(lambda: {"words": 0, "turns": 0, "questions": 0, "longest_turn_words": 0})
    for s in segs:
        st = stats[_name(s)]
        n = len(s.text.split())
        st["words"] += n
        st["turns"] += 1
        st["questions"] += s.text.count("?")
        st["longest_turn_words"] = max(st["longest_turn_words"], n)

    total_words = sum(v["words"] for v in stats.values())
    speakers = sorted(
        (
            {
                "name": name, **v,
                "share_pct": round(100 * v["words"] / (total_words or 1), 1),
                "est_talk_sec": round(v["words"] / WORDS_PER_SEC),
            }
            for name, v in stats.items()
        ),
        key=lambda x: x["words"], reverse=True,
    )

    duration = float(meeting.duration_sec or 0)
    items = list(meeting.action_items)
    today = date.today()
    open_by_assignee = defaultdict(int)
    for a in items:
        if not a.is_done:
            open_by_assignee[a.assignee.name if a.assignee else "Unassigned"] += 1

    return {
        "duration_sec": duration,
        "total_words": total_words,
        "words_per_min": round(total_words / (duration / 60), 1) if duration else None,
        "total_questions": sum(v["questions"] for v in stats.values()),
        "speakers": speakers,
        "dominant_speaker": speakers[0]["name"] if speakers else None,
        "balanced": bool(speakers) and speakers[0]["share_pct"] <= 60,
        "topics_count": len(meeting.topics),
        "action_items": {
            "total": len(items),
            "done": sum(1 for a in items if a.is_done),
            "open": sum(1 for a in items if not a.is_done),
            "overdue": sum(1 for a in items if not a.is_done and a.due_date and a.due_date < today),
            "open_by_assignee": dict(open_by_assignee),
        },
    }