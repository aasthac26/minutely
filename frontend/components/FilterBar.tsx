"use client";
import { Search, X } from "lucide-react";
import type { Filters } from "@/lib/api";
import type { Participant, Tag } from "@/lib/types";

export const EMPTY_FILTERS: Filters = { q: "", participant: "", tag: "", from: "", to: "", sort: "date_desc" };

export default function FilterBar({
  filters, onChange, people, tags,
}: { filters: Filters; onChange: (f: Filters) => void; people: Participant[]; tags: Tag[] }) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input className="field pl-9" placeholder="Search by title" value={filters.q} onChange={(e) => set("q", e.target.value)} />
      </div>
      <select className="field w-auto" value={filters.participant} onChange={(e) => set("participant", e.target.value)}>
        <option value="">All participants</option>
        {people.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
      </select>
      <select className="field w-auto" value={filters.tag} onChange={(e) => set("tag", e.target.value)}>
        <option value="">All tags</option>
        {tags.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
      </select>
      <input type="date" className="field w-auto" value={filters.from} onChange={(e) => set("from", e.target.value)} aria-label="From date" />
      <input type="date" className="field w-auto" value={filters.to} onChange={(e) => set("to", e.target.value)} aria-label="To date" />
      <select className="field w-auto" value={filters.sort} onChange={(e) => set("sort", e.target.value as Filters["sort"])}>
        <option value="date_desc">Newest first</option>
        <option value="date_asc">Oldest first</option>
      </select>
      {dirty && (
        <button className="btn-ghost" onClick={() => onChange(EMPTY_FILTERS)}><X className="size-4" />Clear</button>
      )}
    </div>
  );
}