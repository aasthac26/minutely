"use client";
import { Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { useToast } from "./Toast";

export default function Topbar() {
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const toast = useToast();

  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <button
        onClick={() => window.dispatchEvent(new Event("minutely:palette"))}
        className="flex w-full max-w-md items-center gap-2 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-muted transition hover:border-brand/40"
      >
        <Search className="size-4" />
        <span>Search meetings and transcripts…</span>
        <kbd className="ml-auto rounded border border-line px-1.5 text-[11px]">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={toggleTheme} className="rounded-lg p-2 text-muted hover:bg-bg" aria-label="Toggle theme">
          {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} aria-label="Profile menu"><Avatar name="Aastha" size={32} /></button>
          {menu && (
            <div className="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-line bg-surface p-1 text-sm shadow-lg">
              <div className="px-3 py-2 text-xs text-muted">Signed in as Aastha</div>
              {["Profile", "Workspace", "Sign out"].map((i) => (
                <button
                  key={i}
                  onClick={() => { setMenu(false); toast(`${i} is a placeholder in this demo`, "info"); }}
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-bg"
                >
                  {i}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}