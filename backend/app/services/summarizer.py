import math
import re
from collections import Counter
from datetime import date, timedelta

STOP = set("""a about above after again all also am an and any are as at be because been before being below
between both but by can could did do does doing down during each few for from further had has have having he
her here hers him his how i if in into is it its just let like me more most my no nor not now of off on once
only or other our out over own really right same she should so some such than that the their them then there
these they this those through to too under until up us very was we were what when where which while who why
will with would yeah yes you your okay ok sure thing things going know think yep gonna want got get one two
um uh well""".split())

WORD = re.compile(r"[A-Za-z][A-Za-z'\-]{2,}")
SENT = re.compile(r"(?<=[.!?])\s+")

FIRST_PERSON = re.compile(
    r"\b(i'll|i will|i can take|let me|i'm going to|i am going to)\b", re.I)
GENERAL = re.compile(
    r"\b(action item|follow[- ]?up|need to|needs to|have to|make sure|don't forget|to-?do|can you|could you|please)\b",
    re.I)
REQUEST = re.compile(r"\b(can|could) you\b|\bplease\b", re.I)

WEEKDAYS = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
            "friday": 4, "saturday": 5, "sunday": 6}
DUE = re.compile(
    r"\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|"
    r"end of (?:the )?(?:day|week)|eod|eow|next week)\b|\b(tomorrow|next week)\b", re.I)


def tokens(text: str) -> list[str]:
    return [w.lower() for w in WORD.findall(text) if w.lower() not in STOP]


def top_keywords(segments, n: int = 8) -> list[str]:
    counts = Counter(t for s in segments for t in tokens(s.text))
    return [w for w, _ in counts.most_common(n)]


def build_overview(segments, names: list[str], keywords: list[str]) -> str:
    freq = Counter(t for s in segments for t in tokens(s.text))
    candidates = []
    for s in segments:
        for sent in SENT.split(s.text):
            if 40 <= len(sent) <= 220:
                candidates.append(sent.strip())

    def score(sent: str) -> float:
        toks = tokens(sent)
        return sum(freq[t] for t in toks) / math.sqrt(len(toks) or 1)

    best = sorted(candidates, key=score, reverse=True)[:3]
    picked = [c for c in candidates if c in best]  # restore original order
    head = f"{', '.join(names[:4])} met to discuss {', '.join(keywords[:3])}." if keywords else ""
    return (head + " " + " ".join(picked)).strip()


def parse_due(sentence: str, base: date) -> date | None:
    m = DUE.search(sentence)
    if not m:
        return None
    word = (m.group(1) or m.group(2)).lower()
    if word in WEEKDAYS:
        return base + timedelta(days=(WEEKDAYS[word] - base.weekday()) % 7 or 7)
    if word == "tomorrow":
        return base + timedelta(days=1)
    if word == "next week":
        return base + timedelta(days=7)
    if word in ("eow", "end of week", "end of the week"):
        return base + timedelta(days=(4 - base.weekday()) % 7)
    return base  # eod / end of day


def extract_action_items(segments, names: list[str], base: date, limit: int = 8) -> list[dict]:
    first_names = {n.split()[0].lower(): n for n in names}
    items, seen = [], set()
    for idx, seg in enumerate(segments):
        for sent in SENT.split(seg.text):
            sent = sent.strip()
            if len(sent) < 15:
                continue
            first_person = FIRST_PERSON.search(sent)
            if not (first_person or GENERAL.search(sent)):
                continue
            if sent.endswith("?") and not REQUEST.search(sent):
                continue
            key = sent.lower()[:60]
            if key in seen:
                continue
            seen.add(key)

            assignee = seg.speaker if first_person else None
            if not first_person:
                for fn, full in first_names.items():
                    if re.search(rf"\b{re.escape(fn)}\b", sent, re.I):
                        assignee = full
                        break
            items.append({
                "text": sent[:220],
                "assignee": assignee,
                "due_date": parse_due(sent, base),
                "segment_index": idx,
            })
            if len(items) >= limit:
                return items
    return items


def build_topics(segments) -> list[dict]:
    """Split the meeting into windows and title each by its most distinctive words (TF-IDF style)."""
    if not segments:
        return []
    total = segments[-1].end
    n = min(max(3, min(8, round(total / 300))), len(segments))
    size = math.ceil(len(segments) / n)
    chunks = [segments[i:i + size] for i in range(0, len(segments), size)]
    counts = [Counter(t for s in c for t in tokens(s.text)) for c in chunks]
    doc_freq = Counter(w for c in counts for w in c)
    topics = []
    for chunk, c in zip(chunks, counts):
        best = sorted(c, key=lambda w: c[w] * math.log(1 + len(chunks) / doc_freq[w]), reverse=True)[:3]
        topics.append({
            "title": " · ".join(w.title() for w in best) or "Discussion",
            "start_sec": chunk[0].start,
        })
    return topics


def summarize(segments, names: list[str], base: date) -> dict:
    keywords = top_keywords(segments)
    return {
        "overview": build_overview(segments, names, keywords),
        "keywords": keywords,
        "action_items": extract_action_items(segments, names, base),
        "topics": build_topics(segments),
    }
