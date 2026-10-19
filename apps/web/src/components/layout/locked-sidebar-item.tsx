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
}: {
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  tooltipLabel?: string;
}) {
  return (
    <SidebarTooltip
      label={tooltipLabel ?? label + " — Disponível para administradores"}
      enabled={collapsed || Boolean(tooltipLabel)}
    >
      <div
        role="group"
        aria-label={label + " — disponível apenas para administradores"}
        aria-disabled="true"
        data-nav-locked="true"
        className={cn(
          "relative flex cursor-default items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-sm font-medium",
          collapsed && "justify-center px-0",
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-sidebar-foreground/50" aria-hidden />
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-sidebar-foreground/50">{label}</span>
        )}
        <Lock
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-sidebar-foreground/65",
            collapsed && "absolute bottom-1 right-1 h-2.5 w-2.5",
          )}
        />
      </div>
    </SidebarTooltip>
  );
}
