"use client";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

export const TRACKING_TOOLTIP_LAYER = "pointer-events-none fixed z-[90]";

export const TOOLTIP_OPEN_EVENT = "tracking:tooltip-open";

export function announceTrackingTooltip(id: string) {
  window.dispatchEvent(new CustomEvent(TOOLTIP_OPEN_EVENT, { detail: id }));
}

/** Coordinate independently scoped portals without coupling their content/state. */
export function useTrackingTooltipDismissal(id: string, dismiss: () => void) {
  const latest = useRef(dismiss);
  latest.current = dismiss;
  useEffect(() => {
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) latest.current();
    };
    window.addEventListener(TOOLTIP_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(TOOLTIP_OPEN_EVENT, onOpen);
  }, [id]);
}

let closeActiveConcept: (() => void) | null = null;

/** The shared Popover has a modal backdrop, so it cannot provide hover tooltips.
 * Opens only from this button. Leaving the button, blurring, scrolling or resizing closes immediately. */
export function ConceptHelp({
  label,
  text,
  children,
  className,
  style,
  hoverOnly = false,
}: {
  label: string;
  text: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  hoverOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;
  const close = useRef<(() => void) | null>(null);
  if (!close.current) {
    close.current = () => {
      setOpenRef.current(false);
      if (closeActiveConcept === close.current) closeActiveConcept = null;
    };
  }
  const show = () => {
    if (closeActiveConcept && closeActiveConcept !== close.current) closeActiveConcept();
    window.dispatchEvent(new CustomEvent(TOOLTIP_OPEN_EVENT, { detail: id }));
    closeActiveConcept = close.current;
    setOpen(true);
  };
  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      const card = tip.current;
      if (!anchor || !card) return;
      const width = card.offsetWidth || 280;
      const height = card.offsetHeight || 72;
      const pad = 12;
      const gap = 8;
      const below = anchor.bottom + gap;
      const above = anchor.top - height - gap;
      const top = below + height <= window.innerHeight - pad || above < pad ? below : above;
      const left = anchor.left + anchor.width / 2 - width / 2;
      setBox((current) => {
        const next = {
          left: Math.max(pad, Math.min(left, window.innerWidth - width - pad)),
          top: Math.max(pad, Math.min(top, window.innerHeight - height - pad)),
        };
        return current && current.left === next.left && current.top === next.top ? current : next;
      });
    };
    place();
    const dismiss = close.current;
    if (!dismiss) return;
    const otherTooltip = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) dismiss();
    };
    window.addEventListener(TOOLTIP_OPEN_EVENT, otherTooltip);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) dismiss();
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener(TOOLTIP_OPEN_EVENT, otherTooltip);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, id]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={"Informações sobre " + label}
        aria-describedby={open ? id : undefined}
        onClick={hoverOnly ? undefined : show}
        onFocus={show}
        onBlur={() => close.current?.()}
        onMouseEnter={show}
        onMouseLeave={() => close.current?.()}
        style={style}
        className={
          className ??
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        {children ?? <Info className="h-3.5 w-3.5" aria-hidden />}
      </button>
      {open &&
        createPortal(
          <div
            ref={tip}
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              left: box?.left ?? 0,
              top: box?.top ?? 0,
              visibility: box ? "visible" : "hidden",
              width: 280,
              maxWidth: "calc(100vw - 24px)",
            }}
            data-module-theme="tracking"
            className={TRACKING_TOOLTIP_LAYER + " tracking-portal rounded-xl p-3 text-xs font-normal leading-relaxed shadow-soft"}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Moves a Recharts tooltip out of chart overflow and drops it as soon as the page scrolls or resizes. */
export function TrackingTooltipPortal({
  children,
  resetKey,
}: {
  children: ReactNode;
  resetKey: string;
}) {
  const portalId = useId();
  const measure = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const wrapper = measure.current?.closest(".recharts-tooltip-wrapper");
    if (!(wrapper instanceof HTMLElement)) return;
    let dismissed = false;
    const place = () => {
      if (dismissed) return;
      const rect = wrapper.getBoundingClientRect();
      const width = measure.current?.offsetWidth ?? rect.width;
      const height = measure.current?.offsetHeight ?? rect.height;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const top = Math.max(12, Math.min(rect.top, window.innerHeight - height - 12));
      setBox((current) => (current && current.left === left && current.top === top ? current : { left, top }));
    };
    const dismiss = () => {
      dismissed = true;
      setBox(null);
    };
    const otherTooltip = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== portalId) dismiss();
    };
    window.dispatchEvent(new CustomEvent(TOOLTIP_OPEN_EVENT, { detail: portalId }));
    window.addEventListener(TOOLTIP_OPEN_EVENT, otherTooltip);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(wrapper);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      dismissed = true;
      window.removeEventListener(TOOLTIP_OPEN_EVENT, otherTooltip);
      observer.disconnect();
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [resetKey, portalId]);
  return (
    <>
      <div ref={measure} style={{ visibility: "hidden" }} aria-hidden="true">
        {children}
      </div>
      {box
        ? createPortal(
            <div role="tooltip" className={TRACKING_TOOLTIP_LAYER} style={{ left: box.left, top: box.top }}>
              {children}
            </div>,
            document.body,
          )
        : null}
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
    <div
      data-module-theme="tracking"
      className="tracking-portal pointer-events-none min-w-48 rounded-xl border p-3 text-xs shadow-soft"
    >
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
