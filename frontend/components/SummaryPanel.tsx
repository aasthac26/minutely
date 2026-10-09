import { Sparkles, Trash2 } from "lucide-react";
import { fmtClock } from "@/lib/format";
import type { MeetingDetail, Soundbite } from "@/lib/types";

interface Props {
  meeting: MeetingDetail; soundbites: Soundbite[]; busy: boolean;
  onSeek: (t: number) => void; onGenerate: () => void; onDeleteSoundbite: (id: number) => void;
}

export default function SummaryPanel({ meeting, soundbites, busy, onSeek, onGenerate, onDeleteSoundbite }: Props) {
  const keywords = meeting.summary?.keywords.split(",").map((k) => k.trim()).filter(Boolean) ?? [];
  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Overview</h3>
        <p className="text-sm leading-relaxed">{meeting.summary?.overview || "No summary available."}</p>
      </div>
      {keywords.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Keywords</h3>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k) => <span key={k} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{k}</span>)}
          </div>
        </div>
      )}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Highlights</h3>
          <button className="btn-ghost px-2.5 py-1 text-xs" onClick={onGenerate} disabled={busy}>
            <Sparkles className="size-3.5" />{soundbites.length ? "Regenerate" : "Generate"}
          </button>
        </div>
        {soundbites.length === 0 && <p className="text-sm text-muted">Pick out the key moments of this meeting.</p>}
        <ul className="space-y-1.5">
          {soundbites.map((sb) => (
            <li key={sb.id} className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <button onClick={() => onSeek(sb.start_sec)} className="font-mono text-xs text-brand">{fmtClock(sb.start_sec)}</button>
              <span className="flex-1">{sb.title}</span>
              <button onClick={() => onDeleteSoundbite(sb.id)} className="text-muted hover:text-red-500" aria-label="Delete highlight"><Trash2 className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}