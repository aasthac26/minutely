"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      <button role="switch" aria-checked={on} onClick={() => onChange(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const [prefs, setPrefs] = useState({ summary: true, digest: false, reminders: true });
  const set = (k: keyof typeof prefs) => (v: boolean) => {
    setPrefs((p) => ({ ...p, [k]: v }));
    toast("Preference saved (demo placeholder)", "info");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

      <Section title="Profile">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); toast("Profile saved (demo placeholder)", "info"); }}>
          <label className="text-sm font-medium">Name<input className="field mt-1" defaultValue="Aastha" /></label>
          <label className="text-sm font-medium">Email<input className="field mt-1" defaultValue="aastha@example.com" /></label>
          <div className="sm:col-span-2"><button className="btn-primary">Save profile</button></div>
        </form>
      </Section>

      <Section title="Notifications">
        <Toggle label="Summary ready" desc="Email me when a new meeting summary is ready" on={prefs.summary} onChange={set("summary")} />
        <Toggle label="Daily digest" desc="One email with all open action items" on={prefs.digest} onChange={set("digest")} />
        <Toggle label="Due-date reminders" desc="Remind me the day before an item is due" on={prefs.reminders} onChange={set("reminders")} />
      </Section>

      <Section title="Integrations">
        <ul className="divide-y divide-line text-sm">
          {["Zoom", "Google Meet", "Google Calendar", "Slack", "Salesforce"].map((n) => (
            <li key={n} className="flex items-center justify-between py-2.5">
              <span className="font-medium">{n}</span>
              <span className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold text-muted">Coming soon</span>
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-center text-xs text-muted">Appearance: use the moon/sun icon in the top bar. Authentication is mocked, and you are always signed in as Aastha.</p>
    </div>
  );
}