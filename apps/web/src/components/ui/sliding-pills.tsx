"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Abas em pílula com um fundo roxo que desliza até a opção escolhida.
 * Segue o padrão de abas (role="tablist"/"tab") e aceita setas do teclado.
 */
export function SlidingPills<T extends string>({
  value,
  options,
  onChange,
  className,
  "aria-label": ariaLabel = "Filtro",
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = React.useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = React.useState(false);

  const measure = React.useCallback(() => {
    const el = itemRefs.current.get(value);
    if (!el) return;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value]);

  React.useLayoutEffect(() => {
    measure();
  }, [measure]);

  React.useEffect(() => {
    // Liga a transição só depois da primeira posição, para não "voar" ao carregar.
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  const focusAndSelect = (index: number) => {
    const next = options[(index + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    itemRefs.current.get(next.value)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex h-11 shrink-0 items-center gap-1 rounded-xl border border-border/70 bg-card p-1",
        className,
      )}
    >
      {indicator ? (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-1 top-1 rounded-lg bg-primary shadow-sm",
            animate && "transition-[left,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          )}
          style={{ left: indicator.left, width: indicator.width }}
        />
      ) : null}
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              if (node) itemRefs.current.set(option.value, node);
              else itemRefs.current.delete(option.value);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                focusAndSelect(index + 1);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                focusAndSelect(index - 1);
              }
            }}
            className={cn(
              "relative z-10 inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
