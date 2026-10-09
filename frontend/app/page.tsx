"use client";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import FilterBar, { EMPTY_FILTERS } from "@/components/FilterBar";
import MeetingFormModal from "@/components/MeetingFormModal";
import MeetingRow from "@/components/MeetingRow";
import { useToast } from "@/components/Toast";
import { api, type Filters } from "@/lib/api";
import type { MeetingListItem, Participant, Tag } from "@/lib/types";
import StatsStrip from "@/components/StatsStrip";
export default function LibraryPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [meetings, setMeetings] = useState<MeetingListItem[] | null>(null);
  const [people, setPeople] = useState<Participant[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.participants(), api.tags()])
      .then(([p, t]) => { setPeople(p); setTags(t); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      api.meetings(filters)
        .then((d) => live && setMeetings(d))
        .catch((e: Error) => { if (live) { toast(e.message, "error"); setMeetings([]); } });
    }, 250); // debounce typing
    return () => { live = false; clearTimeout(timer); };
  }, [filters, toast]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Meetings</h1>
          <p className="text-sm text-muted">{meetings ? `${meetings.length} meeting${meetings.length === 1 ? "" : "s"}` : "Loading…"}</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="size-4" />New meeting</button>
      </div>

      <StatsStrip/>
      <FilterBar filters={filters} onChange={setFilters} people={people} tags={tags} />

      <div className="space-y-2.5">
        {meetings === null && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-xl border border-line bg-surface" />
        ))}
        {meetings?.map((m) => <MeetingRow key={m.id} m={m} />)}
        {meetings?.length === 0 && (
          <div className="rounded-xl border border-dashed border-line py-16 text-center text-sm text-muted">
            No meetings match these filters.
          </div>
        )}
      </div>

      {creating && <MeetingFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}