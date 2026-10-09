"use client";
import { Check, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { api, BASE } from "@/lib/api";
import type { ActionItemWithMeeting, Participant } from "@/lib/types";

type Status = "all" | "open" | "done";
const today = () => new Date().toLocaleDateString("en-CA");
const fmtDue = (d: string) => new Date(d + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function ActionItemsPage() {
  const [items, setItems] = useState<ActionItemWithMeeting[] | null>(null);
  const [status, setStatus] = useState<Status>("open");
  const [assignee, setAssignee] = useState("");
  const [people, setPeople] = useState<Participant[]>([]);
  const [tick, setTick] = useState(0);
  const toast = useToast();

  useEffect(() => { api.participants().then(setPeople).catch(() => {}); }, []);

  useEffect(() => {
    let live = true;
    api.actionItems({ is_done: status === "all" ? undefined : status === "done", assignee: assignee || undefined })
      .then((d) => live && setItems(d))
      .catch((e: Error) => { if (live) { toast(e.message, "error"); setItems([]); } });
    return () => { live = false; };
  }, [status, assignee, tick, toast]);

  async function toggle(i: ActionItemWithMeeting) {
    try {
      await api.updateActionItem(i.id, { is_done: !i.is_done });
      toast(i.is_done ? "Reopened" : "Marked complete");
      setTick((t) => t + 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update", "error");
    }
  }

  const csv = `${BASE}/export/action-items${status === "all" ? "" : `?is_done=${status === "done"}`}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Action items</h1>
          <p className="text-sm text-muted">Everything that came out of your meetings, in one place.</p>
        </div>
        <a href={csv} className="btn-ghost"><Download className="size-4" />Export CSV</a>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-surface p-1 text-sm font-medium ring-1 ring-line">
          {(["open", "done", "all"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`rounded-md px-3.5 py-1.5 capitalize ${status === s ? "bg-brand-soft text-brand" : "text-muted"}`}>{s}</button>
          ))}
        </div>
        <select className="field w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">Everyone</option>
          {people.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {items === null && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-line bg-surface" />)}
        {items?.length === 0 && <div className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">Nothing here.</div>}
        {items?.map((i) => {
          const overdue = !i.is_done && i.due_date && i.due_date < today();
          return (
            <div key={i.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5">
              <button onClick={() => toggle(i)} aria-label={i.is_done ? "Reopen" : "Complete"}
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 ${i.is_done ? "border-brand bg-brand text-white" : "border-line hover:border-brand"}`}>
                {i.is_done && <Check className="size-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${i.is_done ? "text-muted line-through" : ""}`}>{i.text}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Link href={`/meetings/${i.meeting_id}`} className="font-medium text-brand hover:underline">{i.meeting_title}</Link>
                  {i.assignee && <span className="inline-flex items-center gap-1"><Avatar name={i.assignee.name} size={18} />{i.assignee.name}</span>}
                  {i.due_date && (
                    <span className={`rounded-full px-2 py-0.5 font-medium ${overdue ? "bg-red-100 text-red-600" : "bg-bg"}`}>
                      {overdue ? "Overdue · " : "Due "}{fmtDue(i.due_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}