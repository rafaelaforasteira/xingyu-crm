"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import styles from "./tracking-overview.module.css";

const MotionContext = createContext({ revision: 0, reduced: true, initial: true });

export function TrackingMotion({ revision, children }: { revision: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const firstRevision = useRef(revision);
  return <MotionContext.Provider value={{ revision, reduced, initial: firstRevision.current === revision }}>{children}</MotionContext.Provider>;
}

export const useTrackingMotion = () => useContext(MotionContext);

/** Frames update only this metric; the dashboard and charts never render per frame. */
export function AnimatedMetric({
  value,
  format,
  duration = 650,
}: {
  value: number | null;
  format: (value: number | null) => string;
  duration?: number;
}) {
  const { revision, reduced } = useTrackingMotion();
  const [shown, setShown] = useState(0);
  const current = useRef(0);
  const initialized = useRef(false);
  useEffect(() => {
    if (value == null || !Number.isFinite(value)) return;
    if (reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = value;
      setShown(value);
      return;
    }
    const first = !initialized.current;
    const from = first ? 0 : current.current;
    initialized.current = true;
    // Unchanged mock values remain stable; the refresh icon and bars acknowledge reprocessing.
    if (from === value) {
      setShown(value);
      return;
    }
    const milliseconds = Math.min(first ? duration : 420, window.innerWidth < 640 ? 500 : 900);
    const start = performance.now();
    let frame = 0;
    setShown(from);
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / milliseconds);
      current.current = from + (value - from) * (1 - Math.pow(1 - progress, 3));
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, revision, reduced, duration]);
  const final = format(value);
  return (
    <span className="tabular-nums">
      <span className="sr-only">{final}</span>
      <span key={revision} className={styles.metricUpdate} aria-hidden="true">{value == null || reduced ? final : format(shown)}</span>
    </span>
  );
}

export function AnimatedProgress({
  value,
  className = "",
}: {
  value: number | null;
  className?: string;
}) {
  const { revision } = useTrackingMotion();
  return (
    <div
      key={revision}
      aria-hidden="true"
      className={styles.bar + " h-full rounded-full " + className}
      style={{ width: Math.max(0, Math.min(100, value ?? 0)) + "%" }}
    />
  );
}
