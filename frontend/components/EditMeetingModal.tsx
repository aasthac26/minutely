"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { MeetingDetail } from "@/lib/types";
import Modal from "./Modal";
import { useToast } from "./Toast";

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function EditMeetingModal({
  meeting, onClose, onSaved,
}: { meeting: MeetingDetail; onClose: () => void; onSaved: (m: MeetingDetail) => void }) {
  const [title, setTitle] = useState(meeting.title);
  const [people, setPeople] = useState(meeting.participants.map((p) => p.name).join(", "));
  const [tags, setTags] = useState(meeting.tags.map((t) => t.name).join(", "));
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast("Title can't be empty", "error");
    setBusy(true);
    try {
      onSaved(await api.updateMeeting(meeting.id, { title: title.trim(), participants: split(people), tags: split(tags) }));
      toast("Meeting updated");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit meeting" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium">Title
          <input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Participants (comma separated)
          <input className="field mt-1" value={people} onChange={(e) => setPeople(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Tags (comma separated)
          <input className="field mt-1" value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </Modal>
  );
}