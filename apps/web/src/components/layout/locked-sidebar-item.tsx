"use client";
import * as React from "react";
import { Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarTooltip } from "./sidebar-tooltip";
export function LockedSidebarItem({
  label,
  icon: Icon,
  collapsed,
  tooltipLabel,
  ariaDescription = "disponível apenas para administradores",
}: {
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  tooltipLabel?: string;
  ariaDescription?: string;
}) {
  return (
    <SidebarTooltip
      label={tooltipLabel ?? label + " — Disponível para administradores"}
      enabled={collapsed || Boolean(tooltipLabel)}
    >
      <div
        role="group"
        aria-label={label + " — " + ariaDescription}
        aria-disabled="true"
        data-nav-locked="true"
        className={cn(
          "relative flex cursor-default select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
          collapsed && "justify-center px-0",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 text-sidebar-muted/60" aria-hidden />
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-sidebar-muted/80">{label}</span>
        )}
        <Lock
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-sidebar-muted/70",
            collapsed && "absolute right-3 top-2 h-2.5 w-2.5",
          )}
        />
      </div>
    </SidebarTooltip>
  );
}
