"use client";
import { ChevronDown, ChevronUp, LocateFixed, MessageSquare, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmtClock, speakerColor } from "@/lib/format";
import type { Comment, Segment } from "@/lib/types";
import { Avatar } from "./Avatar";

interface Props {
  segments: Segment[]; time: number; comments: Comment[];
  onSeek: (t: number) => void;
  onAddComment: (segmentId: number, body: string) => Promise<void>;
  onDeleteComment: (id: number) => void;
}

function Highlighted({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // split with a capture group puts the matches at the odd indexes
  return (
    <>
      {text.split(new RegExp(`(${escaped})`, "gi")).map((part, i) =>
        i % 2 === 1 ? <mark key={i} className="rounded bg-yellow-200 px-0.5 text-black">{part}</mark> : part,
      )}
    </>
  );
}

export default function TranscriptPane({ segments, time, comments, onSeek, onAddComment, onDeleteComment }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [matchIdx, setMatchIdx] = useState(0);
  const [follow, setFollow] = useState(true);
  const [commentFor, setCommentFor] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const q = query.trim();
  const matches = useMemo(
    () => (q ? segments.filter((s) => s.text.toLowerCase().includes(q.toLowerCase())).map((s) => s.id) : []),
    [segments, q],
  );
  const currentMatch = matches.length ? matches[matchIdx % matches.length] : null;

  const byseg = useMemo(() => {
    const map = new Map<number, Comment[]>();
    comments.forEach((c) => {
      if (c.segment_id !== null) map.set(c.segment_id, [...(map.get(c.segment_id) ?? []), c]);
    });
    return map;
  }, [comments]);

  let activeId: number | null = null;
  for (const s of segments) {
    if (s.start_sec <= time) activeId = s.id;
    else break;
  }

  const scrollTo = useCallback((id: number) => {
    const box = boxRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-seg="${id}"]`);
    if (box && el) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, []);

  useEffect(() => { if (follow && activeId !== null) scrollTo(activeId); }, [activeId, follow, scrollTo]);
  useEffect(() => { if (currentMatch !== null) scrollTo(currentMatch); }, [currentMatch, scrollTo]);

  const step = (dir: 1 | -1) => matches.length && setMatchIdx((i) => (i + dir + matches.length) % matches.length);

  async function postComment(segmentId: number) {
    if (!draft.trim()) return;
    await onAddComment(segmentId, draft.trim());
    setDraft("");
    setCommentFor(null);
  }

  return (
    <section className="flex min-h-[420px] flex-1 flex-col rounded-2xl border border-line bg-surface lg:min-h-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h2 className="mr-auto font-semibold">Transcript</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            className="field w-48 py-1.5 pl-8" placeholder="Search transcript" value={query}
            onChange={(e) => { setQuery(e.target.value); setMatchIdx(0); setFollow(false); }}
            onKeyDown={(e) => e.key === "Enter" && step(e.shiftKey ? -1 : 1)}
          />
        </div>
        {q && (
          <div className="flex items-center gap-1 text-xs text-muted">
            <span className="tabular-nums">{matches.length ? `${(matchIdx % matches.length) + 1}/${matches.length}` : "0 results"}</span>
            <button onClick={() => step(-1)} className="rounded p-1 hover:bg-bg" aria-label="Previous match"><ChevronUp className="size-4" /></button>
            <button onClick={() => step(1)} className="rounded p-1 hover:bg-bg" aria-label="Next match"><ChevronDown className="size-4" /></button>
          </div>
        )}
        <button
          onClick={() => { setFollow(true); if (activeId !== null) scrollTo(activeId); }}
          className={`rounded-lg p-2 ${follow ? "bg-brand-soft text-brand" : "text-muted hover:bg-bg"}`}
          title="Follow playback" aria-label="Follow playback"
        >
          <LocateFixed className="size-4" />
        </button>
      </div>

      <div ref={boxRef} className="relative flex-1 overflow-y-auto p-2"
        onWheel={() => setFollow(false)} onTouchMove={() => setFollow(false)}>
        {segments.length === 0 && <p className="p-6 text-center text-sm text-muted">This meeting has no transcript.</p>}
        {segments.map((s) => {
          const name = s.speaker?.name ?? "Unknown";
          const cs = byseg.get(s.id)??[];
          return (
            <div
              key={s.id} data-seg={s.id}
              className={`group flex gap-3 rounded-lg px-3 py-2.5 transition ${
                s.id === activeId ? "bg-brand-soft" : "hover:bg-bg"
              } ${s.id === currentMatch ? "ring-2 ring-brand" : ""}`}
            >
              <Avatar name={name} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold" style={{ color: speakerColor(name) }}>{name}</span>
                  <button onClick={() => onSeek(s.start_sec)} className="font-mono text-muted hover:text-brand">{fmtClock(s.start_sec)}</button>
                  <button
                    onClick={() => { setCommentFor(commentFor === s.id ? null : s.id); setDraft(""); }}
                    className={`rounded p-0.5 text-muted hover:text-brand ${cs.length ? "" : "md:opacity-0 md:group-hover:opacity-100"}`}
                    aria-label="Comment"
                  >
                    <MessageSquare className="size-3.5" />
                  </button>
                </div>
                <p onClick={() => onSeek(s.start_sec)} className="mt-0.5 cursor-pointer text-sm leading-relaxed">
                  <Highlighted text={s.text} q={q} />
                </p>
                {cs.map((c) => (
                  <div key={c.id} className="mt-1.5 flex items-start gap-2 rounded-lg bg-bg px-2.5 py-1.5 text-xs">
                    <MessageSquare className="mt-0.5 size-3 shrink-0 text-brand" />
                    <span className="flex-1">{c.body}</span>
                    <button onClick={() => onDeleteComment(c.id)} className="text-muted hover:text-red-500" aria-label="Delete comment"><Trash2 className="size-3.5" /></button>
                  </div>
                ))}
                {commentFor === s.id && (
                  <div className="mt-1.5 flex gap-2">
                    <input
                      autoFocus className="field py-1.5 text-xs" placeholder="Add a comment" value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && postComment(s.id)}
                    />
                    <button className="btn-primary py-1.5 text-xs" onClick={() => postComment(s.id)}>Post</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}