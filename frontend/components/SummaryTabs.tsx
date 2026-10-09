"use client";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

export interface TabDef {
  key: string; label: string; icon?: LucideIcon; badge?: number; content: React.ReactNode;
}

export default function SummaryTabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0].key);
  return (
    <section className="flex min-h-[420px] flex-col rounded-2xl border border-line bg-surface lg:min-h-0">
      <div className="flex gap-1 overflow-x-auto border-b border-line p-2">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key} onClick={() => setActive(key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              active === key ? "bg-brand-soft text-brand" : "text-muted hover:bg-bg"
            }`}
          >
            {Icon && <Icon className="size-4" />}
            {label}
            {badge ? <span className="rounded-full bg-brand px-1.5 text-[10px] text-white">{badge}</span> : null}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* all panels stay mounted so their state survives tab switches */}
        {tabs.map((t) => <div key={t.key} hidden={t.key !== active}>{t.content}</div>)}
      </div>
    </section>
  );
}