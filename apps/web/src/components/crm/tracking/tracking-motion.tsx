"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import styles from "./tracking-overview.module.css";

const MotionContext = createContext({ revision: 0, reduced: true, initial: true });

export function TrackingMotion({ revision, children }: { revision: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const firstRevision = useRef(revision);
  return <MotionContext.Provider value={{ revision, reduced, initial: firstRevision.current === revision }}>{children}</MotionContext.Provider>;
}

export const useTrackingMotion = () => useContext(MotionContext);

/** Fires once when a relevant slice of the node enters the viewport. */
export function useInViewOnce<T extends Element>(threshold = 0.25): {
  ref: RefObject<T | null>;
  seen: boolean;
} {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useLayoutEffect(() => {
    const node = ref.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    if (!node || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, seen };
}

/** Frames update only this metric; the dashboard and charts never render per frame. */
export function AnimatedMetric({
  value,
  format,
  duration = 650,
  active = true,
}: {
  value: number | null;
  format: (value: number | null) => string;
  duration?: number;
  /** When false, hold the visual count until the surrounding section is on screen. */
  active?: boolean;
}) {
  const { revision, reduced } = useTrackingMotion();
  const [shown, setShown] = useState(0);
  const current = useRef(0);
  const initialized = useRef(false);
  useEffect(() => {
    if (!active) return;
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
  }, [value, revision, reduced, duration, active]);
  const final = format(value);
  return (
    <span className="tabular-nums">
      <span className="sr-only">{final}</span>
      <span className={styles.metricUpdate} aria-hidden="true">{value == null || reduced ? final : format(shown)}</span>
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
  return (
    <div
      aria-hidden="true"
      className={styles.bar + " h-full rounded-full " + className}
      style={{ width: Math.max(0, Math.min(100, value ?? 0)) + "%" }}
    />
  );
}
