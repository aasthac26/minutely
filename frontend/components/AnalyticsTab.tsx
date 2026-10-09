"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtClock, speakerColor } from "@/lib/format";
import type { Analytics } from "@/lib/types";

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{children}</h3>
);

export default function AnalyticsTab({ meetingId, refreshKey }: { meetingId: number; refreshKey: string }) {
  const [a, setA] = useState<Analytics | null>(null);

  useEffect(() => {
    let live = true;
    api.analytics(meetingId).then((d) => live && setA(d)).catch(() => {});
    return () => { live = false; };
  }, [meetingId, refreshKey]); // refreshKey changes when action items change

  if (!a) return <div className="h-40 animate-pulse rounded-xl bg-bg" />;

  const ai = a.action_items;
  const top = a.speakers[0];
  const longest = [...a.speakers].sort((x, y) => y.longest_turn_words - x.longest_turn_words)[0];
  const donePct = ai.total ? Math.round((100 * ai.done) / ai.total) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Words / minute" value={a.words_per_min ?? "–"} />
        <Tile label="Questions asked" value={a.total_questions} />
        <Tile label="Total words" value={a.total_words.toLocaleString()} />
        <Tile label="Chapters" value={a.topics_count} />
      </div>

      <div>
        <H>Talk time</H>
        <div className="space-y-2.5">
          {a.speakers.map((s) => (
            <div key={s.name}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold">{s.name}</span>
                <span className="text-muted">{s.share_pct}% · ~{fmtClock(s.est_talk_sec)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full" style={{ width: `${s.share_pct}%`, background: speakerColor(s.name) }} />
              </div>
            </div>
          ))}
        </div>
        {top && (
          <p className="mt-2.5 text-xs text-muted">
            {a.balanced ? "Balanced conversation." : `${top.name} did most of the talking (${top.share_pct}%).`}
            {longest && ` Longest turn: ${longest.name}, ${longest.longest_turn_words} words.`}
          </p>
        )}
      </div>

      <div>
        <H>Action item progress</H>
        <div className="h-2 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${donePct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-medium text-brand">{ai.done} done</span>
          <span className="rounded-full bg-bg px-2.5 py-0.5 font-medium">{ai.open} open</span>
          {ai.overdue > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-600">{ai.overdue} overdue</span>}
        </div>
        {Object.keys(ai.open_by_assignee).length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {Object.entries(ai.open_by_assignee).map(([who, n]) => (
              <li key={who} className="flex justify-between"><span>{who}</span><span className="font-semibold text-ink">{n} open</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}