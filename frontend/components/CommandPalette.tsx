"use client";
import { CalendarDays, CheckSquare, Mic, Quote, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtClock } from "@/lib/format";
import { EMPTY_FILTERS } from "./FilterBar";
import { Highlighted } from "./Highlighted";

interface Item { key: string; href: string; title: string; sub?: string; snippet?: string; icon: typeof Mic }

const NAV: Item[] = [
  { key: "nav-meetings", href: "/", title: "Meetings", sub: "Go to", icon: CalendarDays },
  { key: "nav-actions", href: "/action-items", title: "Action items", sub: "Go to", icon: CheckSquare },
  { key: "nav-settings", href: "/settings", title: "Settings", sub: "Go to", icon: Settings },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [doneFor, setDoneFor] = useState("");
  const [active, setActive] = useState(0);
  const term = q.trim();

  const close = useCallback(() => { setOpen(false); setQ(""); setResults([]); setActive(0); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("minutely:palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("minutely:palette", onOpen); };
  }, []);

  useEffect(() => {
    if (term.length < 2) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const [ms, hits] = await Promise.all([api.meetings({ ...EMPTY_FILTERS, q: term }), api.search(term)]);
        if (!live) return;
        setResults([
          ...ms.slice(0, 4).map((m): Item => ({ key: `m${m.id}`, href: `/meetings/${m.id}`, title: m.title, sub: "Meeting", icon: Mic })),
          ...hits.map((h): Item => ({
            key: `h${h.segment_id}`, href: `/meetings/${h.meeting_id}?t=${Math.floor(h.start_sec)}`,
            title: h.meeting_title, sub: `${h.speaker ?? "Unknown"} · ${fmtClock(h.start_sec)}`,
            snippet: h.snippet, icon: Quote,
          })),
        ]);
        setActive(0);
      } catch {
        if (live) setResults([]);
      } finally {
        if (live) setDoneFor(term);
      }
    }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [term]);

  if (!open) return null;
  const items = term.length < 2 ? NAV : results;
  const empty = term.length >= 2 && doneFor === term && results.length === 0;
  const go = (it?: Item) => { if (it) { router.push(it.href); close(); } };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={close}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <input
          autoFocus className="w-full border-b border-line bg-transparent px-4 py-3.5 text-sm outline-none"
          placeholder="Search meetings and everything said in them…" value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
            if (e.key === "Enter") go(items[active]);
          }}
        />
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {empty && <p className="px-3 py-6 text-center text-sm text-muted">No matches for “{term}”.</p>}
          {items.map((it, i) => (
            <button
              key={it.key} onClick={() => go(it)} onMouseEnter={() => setActive(i)}
              className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left ${i === active ? "bg-brand-soft" : ""}`}
            >
              <it.icon className="mt-0.5 size-4 shrink-0 text-brand" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{it.title}</span>
                  <span className="shrink-0 text-xs text-muted">{it.sub}</span>
                </span>
                {it.snippet && <span className="mt-0.5 block text-xs text-muted"><Highlighted text={it.snippet} q={term} /></span>}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-4 border-t border-line px-4 py-2 text-[11px] text-muted">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}