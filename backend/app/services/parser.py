import json
import re
from dataclasses import dataclass

WORDS_PER_SEC = 2.5  # used to estimate timings when a transcript has none
TS = r"\d{1,2}(?::\d{2}){1,2}(?:[.,]\d{1,3})?"  # 1:23, 00:01:23, 00:01:23.500

# [00:01:23] Speaker: text   |   00:01:23 Speaker: text
LINE_TS_FIRST = re.compile(rf"^\[?({TS})\]?\s*[-–]?\s*([^:\[\]]{{1,40}}?):\s*(.+)$")
# Speaker (00:01:23): text
LINE_TS_AFTER = re.compile(rf"^([^:\[\](]{{1,40}}?)\s*[\[(]({TS})[\])]\s*:?\s*(.+)$")
# Speaker: text  (speaker is at most 4 words, so "Today we need: x" is not misread)
LINE_PLAIN = re.compile(r"^([A-Za-z][\w.'\-]*(?:\s[\w.'\-]+){0,3}):\s+(.+)$")

VTT_CUE = re.compile(rf"^({TS})\s*-->\s*({TS})")
VTT_VOICE = re.compile(r"<v\s+([^>]+)>")


@dataclass
class ParsedSegment:
    speaker: str
    start: float  # -1 means "unknown, fill in later"
    end: float
    text: str


def parse_ts(value: str) -> float:
    secs = 0.0
    for part in value.replace(",", ".").split(":"):
        secs = secs * 60 + float(part)
    return secs


def parse_txt(text: str) -> list[ParsedSegment]:
    segs: list[ParsedSegment] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if m := LINE_TS_FIRST.match(line):
            segs.append(ParsedSegment(m[2].strip(), parse_ts(m[1]), -1, m[3].strip()))
        elif m := LINE_TS_AFTER.match(line):
            segs.append(ParsedSegment(m[1].strip(), parse_ts(m[2]), -1, m[3].strip()))
        elif m := LINE_PLAIN.match(line):
            segs.append(ParsedSegment(m[1].strip(), -1, -1, m[2].strip()))
        elif segs:
            segs[-1].text += " " + line  # wrapped line: continue the previous speaker
        else:
            segs.append(ParsedSegment("Speaker 1", -1, -1, line))
    return segs


def parse_vtt(text: str) -> list[ParsedSegment]:
    lines = text.replace("\r", "").split("\n")
    segs: list[ParsedSegment] = []
    i = 0
    while i < len(lines):
        m = VTT_CUE.match(lines[i].strip())
        if not m:
            i += 1
            continue
        start, end = parse_ts(m[1]), parse_ts(m[2])
        i += 1
        buf = []
        while i < len(lines) and lines[i].strip():
            buf.append(lines[i].strip())
            i += 1
        body = " ".join(buf)
        speaker = None
        if vm := VTT_VOICE.search(body):
            speaker = vm[1].strip()
        body = re.sub(r"<[^>]+>", "", body).strip()
        if speaker is None and (cm := LINE_PLAIN.match(body)):
            speaker, body = cm[1].strip(), cm[2].strip()
        segs.append(ParsedSegment(speaker or "Speaker 1", start, end, body))
    return segs


def _num(value) -> float:
    if value is None:
        return -1
    if isinstance(value, str):
        return parse_ts(value)
    return float(value)


def parse_json(text: str) -> list[ParsedSegment]:
    data = json.loads(text)
    if isinstance(data, dict):
        data = data.get("segments") or data.get("transcript") or data.get("sentences") or []
    if not isinstance(data, list):
        return []
    segs = []
    for item in data:
        if not isinstance(item, dict):
            continue
        body = (item.get("text") or item.get("content") or item.get("sentence") or "").strip()
        speaker = item.get("speaker") or item.get("speaker_name") or item.get("name") or "Speaker 1"
        start = _num(item.get("start", item.get("start_time", item.get("start_sec"))))
        end = _num(item.get("end", item.get("end_time", item.get("end_sec"))))
        segs.append(ParsedSegment(str(speaker).strip(), start, end, body))
    return segs


def finalize(segs: list[ParsedSegment]) -> list[ParsedSegment]:
    """Fill missing start/end times so every segment has a usable timeline."""
    cursor = 0.0
    for i, s in enumerate(segs):
        if s.start < 0:
            s.start = cursor
        estimate = max(1.5, len(s.text.split()) / WORDS_PER_SEC)
        if s.end < 0:
            nxt = next((x.start for x in segs[i + 1:] if x.start >= 0), None)
            s.end = min(s.start + estimate, nxt) if nxt is not None and nxt > s.start else s.start + estimate
        cursor = s.end
    return segs


def parse_transcript(filename: str, content: str) -> list[ParsedSegment]:
    name = (filename or "").lower()
    body = content.lstrip("\ufeff")
    if name.endswith(".vtt") or body.lstrip().startswith("WEBVTT"):
        segs = parse_vtt(body)
    elif name.endswith(".json"):
        segs = parse_json(body)
    else:
        segs = []
        if body.lstrip().startswith(("{", "[")):
            try:
                segs = parse_json(body)
            except json.JSONDecodeError:
                segs = []  # e.g. "[00:01:23] Speaker: ..." is text, not JSON
        if not segs:
            segs = parse_txt(body)
    segs = [s for s in segs if s.text]
    if not segs:
        raise ValueError("No transcript lines found. Use 'Speaker: text', .vtt, or .json.")
    return finalize(segs)