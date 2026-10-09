"use client";
import { Send } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import type { AskResult } from "@/lib/types";

interface Turn { q: string; res?: AskResult; error?: string }

const SUGGESTIONS = ["Give me a summary", "What are the action items?", "Any blockers or risks?", "What was decided?"];
const LABEL = { summary: "Summary", action_items: "Action items", search: "Best matches" } as const;

export default function AskMeeting({ meetingId, onSeek }: { meetingId: number; onSeek: (t: number) => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const patchLast = (patch: Partial<Turn>) =>
    setTurns((p) => p.map((t, i) => (i === p.length - 1 ? { ...t, ...patch } : t)));

  async function ask(question: string) {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    setInput("");
    setBusy(true);
    setTurns((p) => [...p, { q }]);
    try {
      patchLast({ res: await api.ask(meetingId, q) });
    } catch (e) {
      patchLast({ error: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {turns.length === 0 && (
        <div>
          <p className="mb-2 text-sm text-muted">Ask anything about this meeting. Answers cite the exact moments.</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-full border border-line px-3 py-1 text-xs font-medium hover:bg-brand-soft hover:text-brand">{s}</button>
            ))}
          </div>
        </div>
      )}

      {turns.map((t, i) => (
        <div key={i} className="space-y-2">
          <div className="ml-8 rounded-2xl rounded-br-sm bg-brand px-3.5 py-2 text-sm text-white">{t.q}</div>
          <div className="mr-4 rounded-2xl rounded-bl-sm bg-bg px-3.5 py-2.5 text-sm">
            {t.error ? <span className="text-red-500">{t.error}</span> : !t.res ? (
              <span className="text-muted">Searching the transcript…</span>
            ) : (
              <>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">{LABEL[t.res.intent]}</div>
                <p className="whitespace-pre-line leading-relaxed">{t.res.answer}</p>
                {t.res.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {uniqueSources(t.res.sources).map((s) => (
                      <button key={s.segment_id} onClick={() => onSeek(s.start_sec)}
                        className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand hover:opacity-80">
                        {s.speaker} · {s.timestamp}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="sticky bottom-0 flex gap-2 bg-surface pt-1">
        <input className="field" placeholder="Ask about this meeting" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-primary" disabled={busy} aria-label="Send"><Send className="size-4" /></button>
      </form>
    </div>
  );
}

// Keeps the first occurrence of each segment_id
function uniqueSources<T extends { segment_id: number | string }>(sources: T[]): T[] {
  const seen = new Set<T["segment_id"]>();
  return sources.filter((s) => !seen.has(s.segment_id) && seen.add(s.segment_id));
}