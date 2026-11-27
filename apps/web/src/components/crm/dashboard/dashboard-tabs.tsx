"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type DashboardTab =
  "overview" | "commercial" | "attendance" | "team" | "goals" | "customers" | "channels";

export const DASHBOARD_TABS: Array<{ value: DashboardTab; label: string }> = [
  { value: "overview", label: "Visão geral" },
  { value: "commercial", label: "Comercial" },
  { value: "attendance", label: "Atendimento" },
  { value: "team", label: "Equipe" },
  { value: "goals", label: "Metas" },
  { value: "customers", label: "Clientes" },
  { value: "channels", label: "Canais" },
];

type IndicatorRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export function DashboardTabs({
  value,
  onValueChange,
}: {
  value: DashboardTab;
  onValueChange: (value: DashboardTab) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const pendingValueRef = React.useRef<DashboardTab | null>(null);
  const [visualValue, setVisualValue] = React.useState(value);
  const [indicator, setIndicator] = React.useState<IndicatorRect | null>(null);
  const [canAnimate, setCanAnimate] = React.useState(false);

  React.useEffect(() => {
    if (pendingValueRef.current && pendingValueRef.current !== value) return;
    pendingValueRef.current = null;
    setVisualValue(value);
  }, [value]);

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    const activeIndex = DASHBOARD_TABS.findIndex((tab) => tab.value === visualValue);
    const activeTab = tabRefs.current[activeIndex];
    if (!container || !activeTab) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    setIndicator({
      height: tabRect.height,
      width: tabRect.width,
      x: tabRect.left - containerRect.left,
      y: tabRect.top - containerRect.top,
    });
  }, [visualValue]);

  React.useLayoutEffect(() => {
    measure();
    const frame = window.requestAnimationFrame(() => setCanAnimate(true));
    return () => window.cancelAnimationFrame(frame);
  }, [measure]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    tabRefs.current.forEach((tab) => tab && observer.observe(tab));
    return () => observer.disconnect();
  }, [measure]);

  const selectTab = (nextValue: DashboardTab) => {
    if (nextValue === visualValue) return;
    pendingValueRef.current = nextValue;
    setVisualValue(nextValue);
    onValueChange(nextValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % DASHBOARD_TABS.length;
    if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + DASHBOARD_TABS.length) % DASHBOARD_TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = DASHBOARD_TABS.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    const nextTab = DASHBOARD_TABS[nextIndex];
    if (nextTab) selectTab(nextTab.value);
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Áreas do Dashboard"
      className="relative inline-flex h-auto max-w-full flex-wrap items-center gap-1 rounded-lg bg-muted/70 p-1"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 top-0 rounded-md border border-border/50 bg-card shadow-sm",
          canAnimate &&
            "transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        )}
        style={{
          height: indicator?.height ?? 0,
          transform: `translate3d(${indicator?.x ?? 0}px, ${indicator?.y ?? 0}px, 0)`,
          visibility: indicator ? "visible" : "hidden",
          width: indicator?.width ?? 0,
          willChange: canAnimate ? "transform, width" : undefined,
        }}
      />
      {DASHBOARD_TABS.map((item, index) => {
        const active = visualValue === item.value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => selectTab(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm outline-none transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-muted",
              active
                ? "font-medium text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
