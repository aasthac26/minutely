"use client";
import { CalendarDays, CheckSquare, Plug, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Meetings", icon: CalendarDays },
  { href: "/action-items", label: "Action items", icon: CheckSquare },
  { href: "/coming-soon?feature=Integrations", label: "Integrations", icon: Plug, soon: true },
  { href: "/coming-soon?feature=Team%20%26%20sharing", label: "Team", icon: Users, soon: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();
  const active = (href: string) => {
    const base = href.split("?")[0];
    return base === "/" ? path === "/" || path.startsWith("/meetings") : path.startsWith(base);
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-lg font-extrabold text-white">m</span>
        <span className="text-lg font-extrabold tracking-tight">Minutely</span>
      </Link>
      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(({ href, label, icon: Icon, soon }) => (
          <Link
            key={label} href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active(href) ? "bg-brand-soft text-brand" : "text-muted hover:bg-bg hover:text-ink"
            }`}
          >
            <Icon className="size-[18px]" />
            {label}
            {soon && <span className="ml-auto rounded bg-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">Soon</span>}
          </Link>
        ))}
      </nav>
      <div className="mt-auto m-3 rounded-xl bg-brand-soft p-4 text-xs text-brand">
        <div className="font-semibold">Ask any meeting</div>
        <div className="mt-1 opacity-80">Press Ctrl+K to search every transcript.</div>
      </div>
    </aside>
  );
}