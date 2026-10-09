"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import Modal from "./Modal";
import { useToast } from "./Toast";

const SAMPLE = `[00:00:05] Aastha: Let's kick off. Today we need to finalize the launch plan and pricing.
[00:00:25] Rahul: I'll update the pricing page by Friday. The new tiers are ready for review.
[00:00:48] Meera: Can you share the analytics dashboard link with Rahul? We should also make sure legal reviews the terms.
[00:01:15] Aastha: Good. The launch date is still tentative, so we need to confirm marketing availability before next week.`;

export default function MeetingFormModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast("Give the meeting a title", "error");
    if (mode === "paste" && !text.trim()) return toast("Paste a transcript first", "error");
    if (mode === "upload" && !file) return toast("Choose a .txt, .vtt or .json file", "error");

    setBusy(true);
    try {
      let created;
      if (mode === "paste") {
        created = await api.createFromPaste({
          title: title.trim(), transcript_text: text, meeting_date: date || undefined,
        });
      } else {
        const fd = new FormData();
        fd.append("file", file!);
        fd.append("title", title.trim());
        if (date) fd.append("meeting_date", date);
        created = await api.createFromUpload(fd);
      }
      toast("Meeting created with summary and action items");
      onClose();
      router.push(`/meetings/${created.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create meeting", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New meeting" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-1 rounded-lg bg-bg p-1 text-sm font-medium">
          {(["paste", "upload"] as const).map((m) => (
            <button
              key={m} type="button" onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-1.5 ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}
            >
              {m === "paste" ? "Paste transcript" : "Upload file"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Title
            <input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly sync" />
          </label>
          <label className="text-sm font-medium">Date (optional)
            <input type="datetime-local" className="field mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        {mode === "paste" ? (
          <label className="block text-sm font-medium">
            <span className="flex items-center justify-between">
              Transcript
              <button type="button" className="text-xs font-semibold text-brand" onClick={() => { setText(SAMPLE); if (!title) setTitle("Launch planning"); }}>
                Use sample
              </button>
            </span>
            <textarea className="field mt-1 h-52 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)}
              placeholder={"[00:00:05] Speaker: what they said\nor just  Speaker: text"} />
          </label>
        ) : (
          <label className="block text-sm font-medium">Transcript file
            <input type="file" accept=".txt,.vtt,.json" className="field mt-1" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <span className="mt-1 block text-xs text-muted">Supports .txt, .vtt and .json (max 2 MB).</span>
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? "Processing…" : "Create meeting"}</button>
        </div>
      </form>
    </Modal>
  );
}