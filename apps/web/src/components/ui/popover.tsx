"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type PopoverAlign = "start" | "end";

export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "end",
  sideOffset = 8,
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactElement;
  children: React.ReactNode;
  align?: PopoverAlign;
  sideOffset?: number;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
}) {
  const triggerWrapRef = React.useRef<HTMLSpanElement | null>(null);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [closeEnabled, setCloseEnabled] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) {
      setCloseEnabled(false);
      return;
    }
    const timer = window.setTimeout(() => setCloseEnabled(true), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const updatePosition = React.useCallback(() => {
    const triggerEl = triggerWrapRef.current;
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const width = Math.min(340, Math.max(280, window.innerWidth - 24));
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    let top = rect.bottom + sideOffset;
    const maxHeight = Math.min(680, window.innerHeight - 96);
    if (top + Math.min(maxHeight, 420) > window.innerHeight - 12) {
      top = Math.max(12, rect.top - sideOffset - Math.min(maxHeight, 420));
    }
    setCoords({ top, left, width });
  }, [align, sideOffset]);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(() => updatePosition());
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const content = open ? (
    <>
      <div
        className="fixed inset-0 z-[60]"
        aria-hidden
        data-testid="conversation-filters-backdrop"
        onMouseDown={(event) => {
          if (!closeEnabled) return;
          event.preventDefault();
          onOpenChange(false);
        }}
      />
      <div
        role="dialog"
        aria-modal="false"
        aria-label={ariaLabel ?? "Filtrar conversas"}
        data-testid="conversation-filters-popover"
        className={cn(
          "fixed z-[70] flex max-h-[min(680px,calc(100vh-96px))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl",
          contentClassName,
        )}
        style={
          coords
            ? {
                top: coords.top,
                left: coords.left,
                width: coords.width,
                maxWidth: "calc(100vw - 24px)",
              }
            : {
                top: 72,
                right: 16,
                width: 340,
                maxWidth: "calc(100vw - 24px)",
              }
        }
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </>
  ) : null;

  return (
    <div className={cn("relative inline-flex", className)}>
      <span ref={triggerWrapRef} className="inline-flex">
        {trigger}
      </span>
      {mounted && content ? createPortal(content, document.body) : null}
    </div>
  );
}
