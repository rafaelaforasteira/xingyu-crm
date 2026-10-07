"use client";
import { useId, useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function SidebarTooltip({ label, enabled, children }: { label: string; enabled: boolean; children: ReactNode }) {
  const id = useId();
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const close = () => setAnchor(null);
  useEffect(() => {
    if (!anchor || !enabled) return;
    const dismiss = () => setAnchor(null);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => { window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); };
  }, [anchor, enabled]);
  return <span className="crm-sidebar-tip-trigger" onMouseEnter={event => {
    if (!enabled) return;
    const box = event.currentTarget.getBoundingClientRect();
    setAnchor({ left: box.right + 10, top: box.top + box.height / 2 });
  }} onMouseLeave={close} onFocus={event => {
    if (!enabled) return;
    const box = event.currentTarget.getBoundingClientRect();
    setAnchor({ left: box.right + 10, top: box.top + box.height / 2 });
  }} onBlur={close} onClick={close} aria-describedby={anchor && enabled ? id : undefined}>
    {children}
    {anchor && enabled ? createPortal(<span id={id} role="tooltip" className="crm-sidebar-tip" style={{ left: anchor.left, top: anchor.top }}>{label}</span>, document.body) : null}
  </span>;
}
