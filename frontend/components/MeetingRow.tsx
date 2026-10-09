import { Mic } from "lucide-react";
import Link from "next/link";
import { fmtDate, fmtDuration } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";
import { AvatarStack } from "./Avatar";

export default function MeetingRow({ m }: { m: MeetingListItem }) {
  return (
    <Link
      href={`/meetings/${m.id}`}
      className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 transition hover:border-brand/40 hover:shadow-sm"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Mic className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{m.title}</div>
        <div className="mt-0.5 text-xs text-muted">{fmtDate(m.meeting_date)} · {fmtDuration(m.duration_sec)}</div>
      </div>
      <div className="hidden gap-1.5 sm:flex">
        {m.tags.slice(0, 2).map((t) => (
          <span key={t.id} className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-medium text-muted">{t.name}</span>
        ))}
      </div>
      <AvatarStack names={m.participants.map((p) => p.name)} />
    </Link>
  );
}