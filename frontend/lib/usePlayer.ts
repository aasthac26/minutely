"use client";
import { useCallback, useEffect, useState } from "react";

export const RATES = [1, 1.5, 2, 4];

/** Simulated playback clock. Real transcription/audio is out of scope, so the
 *  meeting timeline advances on a timer; swap in an <audio> element later if needed. */
export function usePlayer(duration: number) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = ((now - last) / 1000) * rate; // computed outside the updater (StrictMode runs updaters twice)
      last = now;
      setTime((t) => Math.min(duration, t + delta));
    }, 100);
    return () => clearInterval(id);
  }, [playing, rate, duration]);

  useEffect(() => {
    if (playing && duration > 0 && time >= duration) setPlaying(false);
  }, [time, duration, playing]);

  const seek = useCallback(
    (t: number, play = false) => {
      setTime(Math.min(Math.max(0, t), duration));
      if (play) setPlaying(true);
    },
    [duration],
  );

  const toggle = useCallback(() => {
    if (!playing && time >= duration) setTime(0);
    setPlaying(!playing);
  }, [playing, time, duration]);

  const skip = (delta: number) => seek(time + delta);

  return { time, playing, rate, setRate, seek, toggle, skip };
}