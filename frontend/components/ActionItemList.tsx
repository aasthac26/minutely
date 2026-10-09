"use client";
import { Check, CornerDownRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import type { ActionItem } from "@/lib/types";
import { Avatar } from "./Avatar";
import { useToast } from "./Toast";

interface Props {
  meetingId: number; items: ActionItem[]; people: string[];
  onChange: (items: ActionItem[]) => void; onJump: (segmentId: number) => void;
}

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
const fmtDue = (d: string) => new Date(d + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function ActionItemList({ meetingId, items, people, onChange, onJump }: Props) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ text: "", assignee: "", due: "" });

  const replace = (u: ActionItem) => onChange(items.map((i) => (i.id === u.id ? u : i)));
  const run = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : "Something went wrong", "error"); }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    run(async () => {
      const created = await api.createActionItem(meetingId, { text: text.trim(), assignee: assignee || null, due_date: due || null });
      onChange([...items, created]);
      setText(""); setAssignee(""); setDue("");
      toast("Action item added");
    });
  };
  const toggle = (i: ActionItem) =>
    run(async () => {
      const u = await api.updateActionItem(i.id, { is_done: !i.is_done });
      replace(u);
      toast(u.is_done ? "Marked complete" : "Reopened");
    });
  const startEdit = (i: ActionItem) => {
    setEditId(i.id);
    setDraft({ text: i.text, assignee: i.assignee?.name ?? "", due: i.due_date ?? "" });
  };
  const save = (i: ActionItem) =>
    run(async () => {
      const u = await api.updateActionItem(i.id, {
        text: draft.text.trim() || i.text, assignee: draft.assignee.trim() || null, due_date: draft.due || null,
      });
      replace(u);
      setEditId(null);
      toast("Action item updated");
    });
  const remove = (i: ActionItem) =>
    run(async () => {
      await api.deleteActionItem(i.id);
      onChange(items.filter((x) => x.id !== i.id));
      toast("Action item deleted");
    });

  const sorted = [...items].sort((a, b) => Number(a.is_done) - Number(b.is_done));

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="space-y-2 rounded-xl border border-line p-3">
        <input className="field" placeholder="Add an action item" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-2">
          <input className="field" list="people" placeholder="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          <input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
          <button className="btn-primary" aria-label="Add"><Plus className="size-4" /></button>
        </div>
        <datalist id="people">{people.map((p) => <option key={p} value={p} />)}</datalist>
      </form>

      {sorted.length === 0 && <p className="text-sm text-muted">No action items yet.</p>}

      <ul className="space-y-2">
        {sorted.map((i) => {
          const overdue = !i.is_done && i.due_date && i.due_date < today();
          return (
            <li key={i.id} className="rounded-xl border border-line p-3">
              {editId === i.id ? (
                <div className="space-y-2">
                  <input className="field" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
                  <div className="flex gap-2">
                    <input className="field" list="people" placeholder="Assignee" value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} />
                    <input type="date" className="field" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost py-1 text-xs" onClick={() => setEditId(null)}><X className="size-3.5" />Cancel</button>
                    <button className="btn-primary py-1 text-xs" onClick={() => save(i)}><Check className="size-3.5" />Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(i)} aria-label={i.is_done ? "Reopen" : "Complete"}
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                      i.is_done ? "border-brand bg-brand text-white" : "border-line hover:border-brand"
                    }`}
                  >
                    {i.is_done && <Check className="size-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${i.is_done ? "text-muted line-through" : ""}`}>{i.text}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {i.assignee && <span className="inline-flex items-center gap-1"><Avatar name={i.assignee.name} size={18} />{i.assignee.name}</span>}
                      {i.due_date && (
                        <span className={`rounded-full px-2 py-0.5 font-medium ${overdue ? "bg-red-100 text-red-600" : "bg-bg"}`}>
                          {overdue ? "Overdue · " : "Due "}{fmtDue(i.due_date)}
                        </span>
                      )}
                      {i.source_segment_id && (
                        <button onClick={() => onJump(i.source_segment_id!)} className="inline-flex items-center gap-1 font-medium text-brand">
                          <CornerDownRight className="size-3" />Jump to moment
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={() => startEdit(i)} className="text-muted hover:text-brand" aria-label="Edit"><Pencil className="size-4" /></button>
                  <button onClick={() => remove(i)} className="text-muted hover:text-red-500" aria-label="Delete"><Trash2 className="size-4" /></button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}