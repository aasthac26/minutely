"use client";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useRef } from "react";
import { fmtClock, speakerColor } from "@/lib/format";
import type { Segment, Topic } from "@/lib/types";
import { RATES } from "@/lib/usePlayer";

interface Props {
  duration: number; time: number; playing: boolean; rate: number;
  segments: Segment[]; topics: Topic[];
  onToggle: () => void; onSeek: (t: number) => void;
  onSkip: (delta: number) => void; onRate: (r: number) => void;
}

export default function Player({
  duration, time, playing, rate, segments, topics, onToggle, onSeek, onSkip, onRate,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const d = duration || 1;
  const pct = Math.min(100, (time / d) * 100);
  const speakers = [...new Set(segments.map((s) => s.speaker?.name ?? "Unknown"))];

  const seekFromPointer = (e: React.PointerEvent) => {
    const r = barRef.current!.getBoundingClientRect();
    onSeek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * d);
  };

  const layer = (opacity: number) =>
    segments.map((s) => (
      <div
        key={s.id}
        className="absolute inset-y-0"
        style={{
          left: `${(s.start_sec / d) * 100}%`,
          width: `${Math.max(((s.end_sec - s.start_sec) / d) * 100, 0.4)}%`,
          background: speakerColor(s.speaker?.name ?? "Unknown"),
          opacity,
        }}
      />
    ));

  return (
    <section className="shrink-0 rounded-2xl border border-line bg-surface p-4">
      <div
        ref={barRef}
        role="slider" tabIndex={0}
        aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)}
        className="relative h-6 cursor-pointer touch-none select-none outline-none"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekFromPointer(e); }}
        onPointerMove={(e) => e.buttons === 1 && seekFromPointer(e)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onSkip(5);
          if (e.key === "ArrowLeft") onSkip(-5);
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-bg">
          {layer(0.3)}
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>{layer(1)}</div>
          {topics.slice(1).map((t) => (
            <div key={t.id} className="absolute inset-y-0 w-[2px] bg-surface" style={{ left: `${(t.start_sec / d) * 100}%` }} />
          ))}
        </div>
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand shadow"
          style={{ left: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button onClick={onToggle} disabled={!duration} aria-label={playing ? "Pause" : "Play"}
          className="flex size-10 items-center justify-center rounded-full bg-brand text-white transition hover:opacity-90 disabled:opacity-40">
          {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
        </button>
        <button onClick={() => onSkip(-10)} className="rounded-lg p-2 text-muted hover:bg-bg" aria-label="Back 10 seconds"><RotateCcw className="size-[18px]" /></button>
        <button onClick={() => onSkip(10)} className="rounded-lg p-2 text-muted hover:bg-bg" aria-label="Forward 10 seconds"><RotateCw className="size-[18px]" /></button>
        <span className="font-mono text-sm tabular-nums">{fmtClock(time)} <span className="text-muted">/ {fmtClock(duration)}</span></span>
        <button
          onClick={() => onRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
          className="ml-auto rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:bg-bg"
          title="Playback speed"
        >
          {rate}x
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {speakers.map((n) => (
          <span key={n} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: speakerColor(n) }} />{n}
          </span>
        ))}
      </div>
    </section>
  );
}