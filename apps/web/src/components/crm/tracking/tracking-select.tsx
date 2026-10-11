"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import styles from "./sales-tracking-filters.module.css";
export function TrackingSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [position, setPosition] = React.useState<React.CSSProperties>({});
  const trigger = React.useRef<HTMLButtonElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  React.useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const below = innerHeight - r.bottom - 18;
      const above = r.top - 18;
      const up = below < Math.min(256, options.length * 36 + 12) && above > below;
      setPosition({
        position: "fixed",
        zIndex: 90,
        left: Math.max(12, Math.min(r.left, innerWidth - r.width - 12)),
        width: Math.min(r.width, innerWidth - 24),
        maxHeight: Math.max(36, Math.min(256, up ? above : below)),
        ...(up ? { bottom: innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const outside = (e: MouseEvent) => {
      if (!trigger.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("mousedown", outside);
    };
  }, [open, options.length]);
  React.useEffect(() => {
    if (!open || !list.current) return;
    const menu = list.current;
    const option = menu.querySelector<HTMLElement>('[data-active="true"]');
    if (!option) return;
    const bounds = menu.getBoundingClientRect();
    const item = option.getBoundingClientRect();
    // Scroll only the menu: scrolling portal ancestors moves the triggering page.
    if (item.top < bounds.top) menu.scrollTop -= bounds.top - item.top;
    else if (item.bottom > bounds.bottom) menu.scrollTop += item.bottom - bounds.bottom;
  }, [open, active]);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-medium">
        {label}
      </label>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? id + "-list" : undefined}
        aria-activedescendant={open ? id + "-option-" + active : undefined}
        aria-label={label}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 text-left text-sm transition hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        onClick={() => {
          setActive(
            Math.max(
              0,
              options.findIndex((o) => o.value === value),
            ),
          );
          setOpen(!open);
        }}
        onKeyDown={(e) => {
          if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            if (!open) {
              setActive(
                Math.max(
                  0,
                  options.findIndex((o) => o.value === value),
                ),
              );
              setOpen(true);
            } else if (e.key === "Enter" || e.key === " ") {
              const option = options[active];
              if (option) onChange(option.value);
              close();
            } else
              setActive(
                (i) => (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length,
              );
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            close();
          } else if (e.key === "Tab") setOpen(false);
          else if (open && (e.key === "Home" || e.key === "End")) {
            e.preventDefault();
            setActive(e.key === "Home" ? 0 : options.length - 1);
          }
        }}
      >
        <span className="truncate">{options.find((o) => o.value === value)?.label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={list}
            id={id + "-list"}
            role="listbox"
            aria-label={label}
            style={position}
            className={"tracking-portal " + styles.menu}
          >
            {options.map((o, i) => (
              <button
                key={o.value}
                id={id + "-option-" + i}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={o.value === value}
                data-active={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  onChange(o.value);
                  close();
                }}
                className={
                  "flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm " +
                  (o.value === value
                    ? "bg-primary/10 font-medium text-foreground"
                    : i === active
                      ? "bg-accent text-foreground"
                      : "text-foreground hover:bg-accent")
                }
              >
                <span>{o.label}</span>
                {o.value === value && <Check className="h-4 w-4 text-primary" aria-hidden />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
