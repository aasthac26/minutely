import re

SIGNALS = [
    (re.compile(r"\b(decid\w*|agree\w*|approved?|final(?:ize|ized)?|priority|let's (?:drop|ship|lock|go|move))\b", re.I), 3.0),
    (re.compile(r"\b(i'll|i will|we'll|we will|by (?:monday|tuesday|wednesday|thursday|friday|tomorrow|next week))\b", re.I), 2.5),
    (re.compile(r"\b(blocked|blocker|risk|concern|issue|problem|crash|tight|security)\b", re.I), 2.0),
    (re.compile(r"\d"), 1.0),
    (re.compile(r"\?"), 0.5),
]
MIN_GAP_SEC = 60


def _score(text: str) -> float:
    score = sum(w for rx, w in SIGNALS if rx.search(text))
    words = len(text.split())
    if 8 <= words <= 35:  # short punchy lines make better soundbites
        score += 1.0
    return score


def _title(text: str, limit: int = 70) -> str:
    text = text.strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def pick_soundbites(segments, top_n: int = 3) -> list[dict]:
    ranked = sorted(segments, key=lambda s: _score(s.text), reverse=True)
    chosen = []
    for seg in ranked:
        if _score(seg.text) <= 0:
            break
        if all(abs(seg.start_sec - c.start_sec) >= MIN_GAP_SEC for c in chosen):
            chosen.append(seg)
        if len(chosen) == top_n:
            break
    return [
        {"title": _title(s.text), "start_sec": s.start_sec, "end_sec": s.end_sec}
        for s in sorted(chosen, key=lambda s: s.start_sec)
    ]