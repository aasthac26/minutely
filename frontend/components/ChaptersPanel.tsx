import { fmtClock } from "@/lib/format";
import type { Topic } from "@/lib/types";

export default function ChaptersPanel({
  topics, time, onSeek,
}: { topics: Topic[]; time: number; onSeek: (t: number) => void }) {
  if (!topics.length) return <p className="text-sm text-muted">No chapters for this meeting.</p>;
  let current = topics[0].id;
  for (const t of topics) if (t.start_sec <= time) current = t.id;

  return (
    <ol className="space-y-1.5">
      {topics.map((t, i) => (
        <li key={t.id}>
          <button
            onClick={() => onSeek(t.start_sec)}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
              t.id === current ? "border-brand bg-brand-soft" : "border-line hover:bg-bg"
            }`}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg text-xs font-bold text-muted">{i + 1}</span>
            <span className="flex-1 font-medium">{t.title}</span>
            <span className="font-mono text-xs text-muted">{fmtClock(t.start_sec)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}