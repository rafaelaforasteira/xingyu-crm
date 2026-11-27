"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsActionMenu({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-lg border bg-card p-1 shadow-soft"
        >
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<{ onSelect?: () => void }>, {
                  onSelect: () => setOpen(false),
                })
              : child,
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SettingsActionItem({
  children,
  onClick,
  onSelect,
  destructive,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50",
        destructive && "text-destructive",
      )}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        onClick();
      }}
    >
      {children}
    </button>
  );
}
