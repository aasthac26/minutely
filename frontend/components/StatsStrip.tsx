"use client";
import { CalendarDays, Clock, ListChecks, Percent } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Overview } from "@/lib/types";

export default function StatsStrip() {
  const [o, setO] = useState<Overview | null>(null);
  useEffect(() => { api.overview().then(setO).catch(() => {}); }, []);

  const cards = [
    { label: "Meetings", value: o?.meetings, icon: CalendarDays },
    { label: "Hours captured", value: o?.total_hours, icon: Clock },
    { label: "Open action items", value: o?.action_items.open, icon: ListChecks },
    { label: "Completion", value: o ? `${o.completion_pct}%` : undefined, icon: Percent },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon className="size-[18px]" /></span>
          <div>
            <div className="text-lg font-extrabold leading-tight tabular-nums">{value ?? "–"}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}