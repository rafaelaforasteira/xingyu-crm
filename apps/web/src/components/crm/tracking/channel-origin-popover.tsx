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
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { money, percentage } from "./tracking-format";
import { AnimatedMetric } from "./tracking-motion";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import { ChannelBrandMark } from "./channel-origin-brand";
import { CHANNEL_HELP } from "./channel-origin-config";
import type { ChannelBarPoint } from "./channel-origin-model";
import { ConceptHelp, announceTrackingTooltip, useTrackingTooltipDismissal } from "./tracking-help";
import styles from "./channel-origin-section.module.css";

type ActiveInsight = { channel: string; anchor: HTMLButtonElement; row: ChannelBarPoint };

const InsightContext = createContext<{
  active: ActiveInsight | null;
  tooltipId: string;
  open: (item: ActiveInsight) => void;
  close: () => void;
} | null>(null);

export function signedMoney(value: number) {
  if (value > 0) return "+" + money(value);
  if (value < 0) return money(value);
  return money(0);
}

export function signedPercent(value: number | null) {
  if (value == null) return "—";
  if (value > 0) return "+" + percentage(value);
  if (value < 0) return "-" + percentage(Math.abs(value));
  return percentage(0);
}

export function deltaSentiment(value: number | null) {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function TrendIcon({ value }: { value: number | null }) {
  const Icon = value == null || value === 0 ? Minus : value > 0 ? ArrowUp : ArrowDown;
  return <Icon size={10} aria-hidden="true" />;
}

export function ChannelInsightScope({
  children,
  className,
  revision,
  order,
}: {
  revision: number;
  order: string;
  children: ReactNode;
  className?: string;
}) {
  const [active, setActive] = useState<ActiveInsight | null>(null);
  const tooltipId = useId();
  useTrackingTooltipDismissal(tooltipId, () => setActive(null));
  const root = useRef<HTMLDivElement>(null);
  const previousBoxes = useRef<Map<string, DOMRect> | null>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const cards = [...node.querySelectorAll<HTMLElement>("[data-channel-insight-trigger]")];
    const next = new Map<string, DOMRect>();
    for (const card of cards) {
      const id = card.getAttribute("data-channel-insight-trigger");
      if (!id) continue;
      const box = card.getBoundingClientRect();
      const before = previousBoxes.current?.get(id);
      if (before && !reduced) {
        const dx = before.left - box.left;
        const dy = before.top - box.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          card.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
            { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          );
        }
      }
      next.set(id, box);
    }
    previousBoxes.current = next;
  }, [order, reduced]);
  useEffect(() => setActive(null), [revision]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-channel-insight-trigger]")) {
        setActive(null);
      }
    };
    const dismiss = () => setActive(null);
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, []);
  return (
    <InsightContext.Provider value={{ active, tooltipId, open: (item) => { announceTrackingTooltip(tooltipId); setActive(item); }, close: () => setActive(null) }}>
      <div
        ref={root}
        className={className}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") setActive(null);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
        }}
      >
        {children}
      </div>
      {active ? <ChannelInsightPopover item={active} id={tooltipId} /> : null}
    </InsightContext.Provider>
  );
}

export function ChannelCard({
  row,
  index,
  animate,
}: {
  row: ChannelBarPoint;
  index: number;
  animate: boolean;
}) {
  const context = useContext(InsightContext);
  if (!context) throw new Error("ChannelCard requires ChannelInsightScope");
  return (
    <article
      data-channel-insight-trigger={row.channel}
      data-channel={row.channel}
      className={styles.channelCard}
      style={{ "--delay": `${index * 40}ms`, "--accent": row.color } as CSSProperties}
    >
      <span className={styles.channelTop}>
        <span className={styles.channelIdentity}>
          <span className={styles.channelMark}>
            <ChannelBrandMark channel={row.channel} size={20} />
          </span>
          <span className={styles.channelName}>{row.label}</span>
          <ConceptHelp
            label={row.label}
            text={CHANNEL_HELP[row.channel]}
            className={styles.channelHelp}
            hoverOnly
          />
        </span>
      </span>
      <span className={styles.channelMetricRow}>
        <span className={styles.channelValue}>
          <AnimatedMetric value={row.netRevenue} format={money} duration={520} active={animate} />
        </span>
        <span className={styles.delta} data-sentiment={deltaSentiment(row.growthRate)}>
          <TrendIcon value={row.growthRate} />
          {signedPercent(row.growthRate)}
        </span>
      </span>
      <span className={styles.channelShare}>
        <AnimatedMetric value={row.revenueShare} format={percentage} duration={420} active={animate} />
      </span>
      <span className={styles.channelBar} aria-hidden="true">
        <span className={styles.channelBarFill} style={{ width: row.currentWidth + "%" }} />
      </span>
    </article>
  );
}

function ChannelInsightPopover({ item, id }: { item: ActiveInsight; id: string }) {
  const card = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const update = () => {
      if (!card.current || !item.anchor.isConnected) return;
      setPosition(placeInsight(item.anchor, card.current));
    };
    update();
    const observer = new ResizeObserver(update);
    const node = card.current;
    if (!node) return;
    observer.observe(node);
    observer.observe(item.anchor);
    return () => {
      observer.disconnect();
    };
  }, [item]);
  const { row } = item;
  const scale = Math.max(row.netRevenue, row.previousNetRevenue, 1);
  return createPortal(
    <div
      ref={card}
      id={id}
      role="tooltip"
      data-module-theme="tracking"
      className={styles.insightPopover + " tracking-portal rounded-xl shadow-soft"}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden",
        "--accent": row.color,
      } as CSSProperties}
    >
      <div key={row.channel} className={styles.insightPopoverBody}>
        <header className={styles.insightPopoverHead}>
          <span className={styles.channelIdentity}>
            <span className={styles.channelMark}>
              <ChannelBrandMark channel={row.channel} size={16} />
            </span>
            <span className={styles.insightPopoverTitle}>{row.label}</span>
          </span>
          <span className={styles.delta} data-sentiment={deltaSentiment(row.growthRate)}>
            <TrendIcon value={row.growthRate} />
            {signedPercent(row.growthRate)}
          </span>
        </header>
        <p className={styles.insightPopoverLabel}>Receita atual</p>
        <p className={styles.insightPopoverValue}>{money(row.netRevenue)}</p>
        <span className={styles.compareTrack} aria-hidden="true">
          <span
            className={styles.compareFill}
            data-tone="current"
            style={{ width: (row.netRevenue / scale) * 100 + "%" }}
          />
        </span>
        <p className={styles.insightPopoverLabel}>Receita anterior</p>
        <p className={styles.insightPopoverValueMuted}>{money(row.previousNetRevenue)}</p>
        <span className={styles.compareTrack} aria-hidden="true">
          <span
            className={styles.compareFill}
            data-tone="previous"
            style={{ width: (row.previousNetRevenue / scale) * 100 + "%" }}
          />
        </span>
        <div className={styles.insightPopoverFoot}>
          <div>
            <p className={styles.insightPopoverLabel}>Variação</p>
            <p className={styles.insightPopoverFootValue} data-sentiment={deltaSentiment(row.delta)}>
              {signedMoney(row.delta)}
            </p>
          </div>
          <div>
            <p className={styles.insightPopoverLabel}>Participação</p>
            <p className={styles.insightPopoverFootValue}>{percentage(row.revenueShare)}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function placeInsight(anchorEl: HTMLElement, tooltipEl: HTMLElement) {
  const anchor = anchorEl.getBoundingClientRect();
  const { width, height } = tooltipEl.getBoundingClientRect();
  const pad = 12;
  const gap = 10;
  const candidates = [
    { left: anchor.left + (anchor.width - width) / 2, top: anchor.top - height - gap },
    { left: anchor.right + gap, top: anchor.top + (anchor.height - height) / 2 },
    { left: anchor.left - width - gap, top: anchor.top + (anchor.height - height) / 2 },
    { left: anchor.left + (anchor.width - width) / 2, top: anchor.bottom + gap },
  ];
  const fits = (point: { left: number; top: number }) =>
    point.left >= pad &&
    point.top >= pad &&
    point.left + width <= window.innerWidth - pad &&
    point.top + height <= window.innerHeight - pad;
  const chosen = candidates.find(fits) ?? candidates[0]!;
  return {
    left: Math.max(pad, Math.min(chosen.left, window.innerWidth - width - pad)),
    top: Math.max(pad, Math.min(chosen.top, window.innerHeight - height - pad)),
  };
}
