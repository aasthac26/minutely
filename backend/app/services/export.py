def fmt_ts(sec: float) -> str:
    m, s = divmod(int(sec), 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def build_export(meeting, fmt: str) -> str:
    md = fmt == "md"
    head = lambda t: f"## {t}" if md else t.upper()
    out = [f"# {meeting.title}" if md else meeting.title.upper()]
    out.append(f"{meeting.meeting_date:%d %b %Y, %H:%M} · {fmt_ts(meeting.duration_sec)} · "
               f"{', '.join(p.name for p in meeting.participants)}")

    if meeting.summary:
        out += ["", head("Summary"), meeting.summary.overview]
    if meeting.topics:
        out += ["", head("Topics")] + [f"- [{fmt_ts(t.start_sec)}] {t.title}" for t in meeting.topics]
    if meeting.action_items:
        out += ["", head("Action items")]
        for a in meeting.action_items:
            box = "[x]" if a.is_done else "[ ]"
            who = f" ({a.assignee.name})" if a.assignee else ""
            due = f" - due {a.due_date}" if a.due_date else ""
            out.append(f"- {box} {a.text}{who}{due}")
    out += ["", head("Transcript")]
    for s in meeting.segments:
        who = s.speaker.name if s.speaker else "Unknown"
        out.append(f"[{fmt_ts(s.start_sec)}] {who}: {s.text}")
    return "\n".join(out)