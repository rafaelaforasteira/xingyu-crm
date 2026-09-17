"use client";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./financial-funnel.module.css";

type ActiveTooltip = { id: string; anchor: HTMLButtonElement; content: ReactNode; tone: string };
const TooltipContext = createContext<{
  active: ActiveTooltip | null;
  tooltipId: string;
  open: (item: ActiveTooltip) => void;
} | null>(null);

/** One active item and one portal, scoped exclusively to this financial funnel. */
export function FunnelTooltipScope({
  children,
  className,
  revision,
}: {
  revision: number;
  children: ReactNode;
  className?: string;
}) {
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const tooltipId = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setActiveTooltip(null), [revision]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveTooltip(null);
    };
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !root.current?.contains(target) ||
        !target.closest("[data-funnel-tooltip-trigger]")
      )
        setActiveTooltip(null);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  return (
    <TooltipContext.Provider
      value={{
        active: activeTooltip,
        tooltipId,
        open: setActiveTooltip,
      }}
    >
      <div
        ref={root}
        className={className}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") setActiveTooltip(null);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setActiveTooltip(null);
        }}
      >
        {children}
      </div>
      {activeTooltip && <FinancialFunnelTooltip item={activeTooltip} id={tooltipId} />}
    </TooltipContext.Provider>
  );
}

export function FunnelTooltipTrigger({
  label,
  text,
  children,
  className,
  style,
  tone = "rate",
}: {
  label: string;
  text: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  tone?: string;
}) {
  const context = useContext(TooltipContext);
  const id = useId();
  if (!context) throw new Error("Funnel tooltip requires its local scope");
  const show = (anchor: HTMLButtonElement) => context.open({ id, anchor, content: text, tone });
  return (
    <button
      type="button"
      data-funnel-tooltip-trigger={id}
      aria-label={"Entender " + label}
      aria-describedby={context.active?.id === id ? context.tooltipId : undefined}
      className={className}
      style={style}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") show(event.currentTarget);
      }}
      onFocus={(event) => show(event.currentTarget)}
      onClick={(event) => show(event.currentTarget)}
    >
      {children}
    </button>
  );
}

function FinancialFunnelTooltip({ item, id }: { item: ActiveTooltip; id: string }) {
  const card = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const update = () => {
      if (!card.current || !item.anchor.isConnected) return;
      const anchor = item.anchor.getBoundingClientRect();
      const { width, height } = card.current.getBoundingClientRect();
      const padding = 12,
        gap = 12;
      const leftFits = anchor.left - width - gap >= padding;
      const rightFits = anchor.right + width + gap <= window.innerWidth - padding;
      const preferLeft = item.tone !== "rate";
      let left: number, top: number;
      if ((preferLeft && leftFits) || (!rightFits && leftFits)) {
        left = anchor.left - width - gap;
        top = anchor.top + (anchor.height - height) / 2;
      } else if (rightFits) {
        left = anchor.right + gap;
        top = anchor.top + (anchor.height - height) / 2;
      } else {
        left = anchor.left + (anchor.width - width) / 2;
        top =
          anchor.top - height - gap >= padding ? anchor.top - height - gap : anchor.bottom + gap;
      }
      setPosition({
        left: Math.max(padding, Math.min(left, window.innerWidth - width - padding)),
        top: Math.max(padding, Math.min(top, window.innerHeight - height - padding)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    if (card.current) observer.observe(card.current);
    observer.observe(item.anchor);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [item]);
  return createPortal(
    <div
      ref={card}
      id={id}
      role="tooltip"
      data-financial-funnel-tooltip
      data-tone={item.tone}
      className={`${styles.funnelTooltip} rounded-2xl border border-primary/10 bg-card p-3 text-xs leading-relaxed text-foreground shadow-soft`}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <div key={item.id} className={styles.tooltipSwap}>
        {item.content}
      </div>
    </div>,
    document.body,
  );
}
