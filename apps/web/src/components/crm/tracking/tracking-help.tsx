"use client";
import { useEffect, useId, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

/** The shared Popover has a modal backdrop, so it cannot provide hover tooltips.
 * This small local tooltip supports focus, Escape, touch and hoverable content. */
export function ConceptHelp({
  label,
  text,
  children,
  className,
  style,
}: {
  label: string;
  text: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const [position, setPosition] = useState<{ left: number; top: number; above: boolean } | null>(
    null,
  );
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    const rect = trigger.current?.getBoundingClientRect();
    if (rect)
      setPosition({
        left: Math.max(12, Math.min(rect.left - 120, window.innerWidth - 292)),
        top: rect.bottom + 8,
        above: window.innerHeight - rect.bottom < 170,
      });
  };
  const hide = () => {
    timer.current = setTimeout(() => setPosition(null), 170);
  };
  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", show);
    window.addEventListener("scroll", show, true);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", show);
      window.removeEventListener("scroll", show, true);
    };
  }, [position]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={"Entender " + label}
        aria-describedby={position ? id : undefined}
        onClick={show}
        onFocus={show}
        onBlur={hide}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={style}
        className={
          className ??
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        {children ?? <Info className="h-3.5 w-3.5" aria-hidden />}
      </button>
      {position &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              left: position.left,
              top: position.above ? position.top - 40 : position.top,
              transform: position.above ? "translateY(-100%)" : undefined,
              width: 280,
              maxWidth: "calc(100vw - 24px)",
            }}
            className="z-[90] rounded-xl border border-border bg-card p-3 text-xs font-normal leading-relaxed text-foreground shadow-soft"
            onMouseEnter={() => {
              if (timer.current) clearTimeout(timer.current);
            }}
            onMouseLeave={hide}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
export function ChartTooltip({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: Array<[string, string]>;
  accent?: string;
}) {
  return (
    <div className="min-w-48 rounded-xl border border-border bg-card p-3 text-xs shadow-soft">
      <p className="mb-2 flex items-center gap-2 font-semibold">
        {accent ? (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />
        ) : null}
        {title}
      </p>
      <dl className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
